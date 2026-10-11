"""
API V1 Routes - All endpoints
"""
import json
import logging
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional, Dict, Any
from uuid import UUID, uuid4

from app.workers.executor import job_queue
import secrets

logger = logging.getLogger(__name__)

from app.core.security import (
    create_access_token, verify_token,
    google_exchange_code, get_google_auth_url,
    github_exchange_code, get_github_auth_url
)

router = APIRouter()
security = HTTPBearer(auto_error=False)

# ============ Schemas ============

class LoginRequest(BaseModel):
    code: str
    provider: str  # google, github
    state: str

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class ProjectCreate(BaseModel):
    name: str
    repository_id: str
    branch: str = "main"
    build_command: str = "npm run build"
    start_command: str = "npm start"
    env_vars: Dict[str, str] = {}
    ai_model: Optional[str] = None

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    qa_config: Optional[Dict[str, List[str]]] = None
    ai_model: Optional[str] = None
    branch: Optional[str] = None

class QARunCreate(BaseModel):
    project_id: str
    qa_config: Dict[str, List[str]] = {}

class IntegrationConnect(BaseModel):
    vendor: str
    config: Dict[str, Any] = {}
    credentials: Dict[str, str] = {}

# ============ Auth Endpoints ============

class FirebaseLoginRequest(BaseModel):
    firebaseToken: str
    uid: str
    email: Optional[str] = None
    displayName: Optional[str] = None
    photoURL: Optional[str] = None
    provider: str

@router.post("/auth/firebase")
async def firebase_auth(request: FirebaseLoginRequest):
    """
    Verify Firebase ID token and create/get user session.
    This is the main authentication endpoint when using Firebase Auth.
    """
    from app.core.firebase_auth import verify_firebase_token, get_or_create_user
    
    # Verify Firebase token
    firebase_user = await verify_firebase_token(request.firebaseToken)
    
    if not firebase_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Firebase token"
        )
    
    # Get or create user in database
    try:
        user_data = await get_or_create_user(firebase_user)
    except Exception as exc:
        # Database unavailable / not initialized — the Firebase session is
        # still valid, so issue a token from the Firebase identity instead of
        # failing login outright.
        logger.warning("get_or_create_user failed (%s); issuing token from Firebase identity", exc)
        user_data = {
            "id": request.uid,
            "email": firebase_user.get("email") or request.email,
            "name": firebase_user.get("display_name") or request.displayName or request.email,
            "organizationId": None,
            "organizationName": None,
            "createdAt": None,
        }

    # Create backend session token (JWT). Note: no role claim — RBAC has been
    # removed until implemented; every authenticated user owns their org data.
    token = create_access_token({
        "sub": user_data["id"],
        "email": user_data["email"],
        "firebase_uid": request.uid,
        "organization_id": user_data.get("organizationId"),
    })

    return {
        "token": token,
        "user": user_data,
    }

# Keep old OAuth endpoints for backwards compatibility
@router.get("/auth/google/url")
async def google_auth_url():
    """Get Google OAuth authorization URL (legacy - use Firebase instead)"""
    state = secrets.token_urlsafe(32)
    url = get_google_auth_url(state)
    return {"url": url, "state": state}

@router.get("/auth/github/url")
async def github_auth_url():
    """Get GitHub OAuth authorization URL (legacy - use Firebase instead)"""
    state = secrets.token_urlsafe(32)
    url = get_github_auth_url(state)
    return {"url": url, "state": state}

# ============ Shared helpers (DB persistence) ============

def _to_uuid(value: Any) -> Optional[UUID]:
    try:
        return UUID(str(value))
    except (ValueError, TypeError, AttributeError):
        return None

async def _resolve_identity(credentials) -> Dict[str, Any]:
    """Resolve the caller's identity from their JWT.

    Prefers the database row (so organization scoping is authoritative) and
    falls back to the token claims when the DB is unavailable. Raises 401
    only when the token itself is invalid — never on infrastructure errors.
    """
    payload = verify_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    identity = {
        "user_id": _to_uuid(payload.get("sub")),
        "firebase_uid": payload.get("firebase_uid"),
        "email": payload.get("email"),
        "organization_id": _to_uuid(payload.get("organization_id")),
    }

    try:
        from app.db.session import AsyncSessionLocal
        from app.models.models import User

        async with AsyncSessionLocal() as db:
            stmt = select(User)
            if identity["user_id"] is not None:
                stmt = stmt.where(User.id == identity["user_id"])
            elif identity["firebase_uid"]:
                stmt = stmt.where(User.firebase_uid == identity["firebase_uid"])
            else:
                stmt = stmt.where(User.email == identity["email"])
            result = await db.execute(stmt.limit(1))
            user = result.scalar_one_or_none()
            if user:
                identity["user_id"] = user.id
                identity["organization_id"] = user.organization_id
                identity["email"] = user.email
    except Exception as exc:
        # DB unavailable — continue with token claims; endpoints that need an
        # organization will report a clear error instead of crashing.
        logger.warning("Identity DB lookup unavailable: %s", exc)

    return identity

def _project_dict(p, full_name: str) -> Dict[str, Any]:
    qa_cfg = p.default_qa_config or {}
    return {
        "id": str(p.id),
        "name": p.name,
        "repositoryId": str(p.repository_id),
        "repository": full_name,
        "branch": p.branch,
        "buildCommand": p.build_command,
        "startCommand": p.start_command,
        "aiModel": (p.env_vars or {}).get("ai_model"),
        "status": getattr(p.status, "value", str(p.status)),
        "qaConfig": qa_cfg,
        "configured": bool(qa_cfg.get("__saved")),
        "lastRunAt": p.last_run_at.isoformat() if p.last_run_at else None,
        "createdAt": p.created_at.isoformat() if p.created_at else None,
    }

def _run_dict(r, project_name: str) -> Dict[str, Any]:
    cfg = dict(r.qa_config or {})
    ai_model = cfg.pop("ai_model", None)
    cfg.pop("__saved", None)
    return {
        "id": str(r.id),
        "projectId": str(r.project_id),
        "projectName": project_name,
        "status": getattr(r.status, "value", str(r.status)),
        "currentStep": r.current_step,
        "progress": r.progress or 0,
        "testCount": r.test_count or 0,
        "findingsCount": r.findings_count or 0,
        "confirmedBugs": r.confirmed_bugs or 0,
        "startedAt": r.started_at.isoformat() if r.started_at else None,
        "completedAt": r.completed_at.isoformat() if r.completed_at else None,
        "config": cfg,
        "aiModel": ai_model,
        "errorMessage": r.error_message,
    }

# ============ User Endpoints ============

@router.get("/users/me")
async def get_current_user_info(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get current authenticated user"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = verify_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    identity = await _resolve_identity(credentials)
    name = None
    org_name = None
    created_at = None
    try:
        from app.db.session import AsyncSessionLocal
        from app.models.models import User, Organization
        async with AsyncSessionLocal() as db:
            if identity["user_id"] is not None:
                result = await db.execute(select(User).where(User.id == identity["user_id"]))
                user = result.scalar_one_or_none()
                if user:
                    name = user.name
                    created_at = user.created_at.isoformat() if user.created_at else None
            if identity["organization_id"] is not None:
                result = await db.execute(select(Organization).where(Organization.id == identity["organization_id"]))
                org = result.scalar_one_or_none()
                if org:
                    org_name = org.name
    except Exception as exc:
        logger.warning("users/me DB enrichment unavailable: %s", exc)

    return {
        "id": str(identity["user_id"]) if identity["user_id"] else payload.get("sub"),
        "email": identity["email"],
        "name": name,
        "provider": payload.get("provider"),
        "organizationId": str(identity["organization_id"]) if identity["organization_id"] else None,
        "organization": org_name,
        "createdAt": created_at,
    }

# ============ Repository Endpoints ============

@router.get("/repositories")
async def list_repositories(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """List connected GitHub repositories"""
    if not credentials:
        raise HTTPException(status_code=401)
    
    # In production: query database for user's connected repositories
    # Also: use GitHub App installation token to fetch fresh repo list
    return {"repositories": []}

@router.post("/repositories/connect")
async def connect_repository(
    body: Dict[str, Any],
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Connect a GitHub repository"""
    repo_id = body.get("github_id")
    # In production: store repository connection, set up webhooks
    return {"status": "connected", "repository_id": repo_id}

# ============ Project Endpoints ============

@router.get("/projects")
async def list_projects(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """List all projects for the current organization (persisted)."""
    if not credentials:
        raise HTTPException(status_code=401)

    identity = await _resolve_identity(credentials)
    org_id = identity["organization_id"]
    if org_id is None:
        return {"projects": []}

    from app.db.session import AsyncSessionLocal
    from app.models.models import Project, Repository

    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Project, Repository.full_name)
                .outerjoin(Repository, Project.repository_id == Repository.id)
                .where(Project.organization_id == org_id)
                .order_by(Project.created_at.desc())
            )
            projects = [
                _project_dict(p, full_name or p.name)
                for (p, full_name) in result.all()
            ]
        return {"projects": projects}
    except Exception as exc:
        logger.error("list_projects failed: %s", exc)
        raise HTTPException(status_code=503, detail="Project storage is currently unavailable.")

@router.post("/projects")
async def create_project(
    body: ProjectCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a new QA project (persisted to the database)."""
    if not credentials:
        raise HTTPException(status_code=401)

    identity = await _resolve_identity(credentials)
    org_id = identity["organization_id"]
    if org_id is None:
        raise HTTPException(
            status_code=503,
            detail="User account is not linked to an organization yet. Sign out and sign in again.",
        )

    from app.db.session import AsyncSessionLocal
    from app.models.models import Project, Repository, ProjectStatus
    from datetime import datetime

    repo_uuid = _to_uuid(body.repository_id)
    try:
        async with AsyncSessionLocal() as db:
            # Ensure the repository row exists so the FK stays valid; reuse
            # it when the same GitHub repo was added before (prevents dupes).
            parts = body.repository_id.split("/")
            owner = parts[0] if len(parts) == 2 else "unknown"
            name = parts[1] if len(parts) == 2 else body.repository_id

            repo = None
            if repo_uuid is not None:
                repo = (await db.execute(
                    select(Repository).where(Repository.github_id == repo_uuid.int)
                )).scalar_one_or_none()
            if repo is None:
                repo = (await db.execute(
                    select(Repository).where(Repository.full_name == body.repository_id)
                )).scalar_one_or_none()
            if repo is None:
                repo = Repository(
                    id=repo_uuid or uuid4(),
                    organization_id=org_id,
                    github_id=repo_uuid.int if repo_uuid is not None else abs(hash(body.repository_id)) % (2**62),
                    full_name=body.repository_id,
                    name=name,
                    owner=owner,
                    default_branch=body.branch or "main",
                    connected=True,
                    created_at=datetime.utcnow(),
                )
                db.add(repo)
                await db.flush()

            env_vars = dict(body.env_vars or {})
            if body.ai_model:
                env_vars["ai_model"] = body.ai_model

            project = Project(
                id=uuid4(),
                organization_id=org_id,
                repository_id=repo.id,
                name=body.name,
                status=ProjectStatus.ACTIVE,
                branch=body.branch or repo.default_branch or "main",
                build_command=body.build_command,
                start_command=body.start_command,
                env_vars=env_vars,
                default_qa_config={},
                created_at=datetime.utcnow(),
            )
            db.add(project)
            await db.commit()
            await db.refresh(project)
            return _project_dict(project, repo.full_name)
    except Exception as exc:
        logger.error("create_project failed: %s", exc)
        raise HTTPException(status_code=503, detail="Project storage is currently unavailable.")

@router.patch("/projects/{project_id}")
async def update_project(
    project_id: str,
    body: ProjectUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update a project's saved configuration (name, QA scope, AI model)."""
    if not credentials:
        raise HTTPException(status_code=401)

    identity = await _resolve_identity(credentials)
    proj_uuid = _to_uuid(project_id)
    if proj_uuid is None:
        raise HTTPException(status_code=404, detail="Project not found")

    from app.db.session import AsyncSessionLocal
    from app.models.models import Project, Repository
    from datetime import datetime

    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Project, Repository.full_name)
                .outerjoin(Repository, Project.repository_id == Repository.id)
                .where(Project.id == proj_uuid)
            )
            row = result.one_or_none()
            if row is None:
                raise HTTPException(status_code=404, detail="Project not found")
            project, full_name = row
            if identity["organization_id"] and project.organization_id != identity["organization_id"]:
                raise HTTPException(status_code=403, detail="Not your project")

            if body.name:
                project.name = body.name
            if body.branch:
                project.branch = body.branch
            if body.qa_config is not None:
                cfg = {k: v for k, v in body.qa_config.items() if isinstance(v, list)}
                cfg["__saved"] = True
                cfg["__savedAt"] = datetime.utcnow().isoformat()
                project.default_qa_config = cfg
            if body.ai_model:
                env = dict(project.env_vars or {})
                env["ai_model"] = body.ai_model
                project.env_vars = env

            project.updated_at = datetime.utcnow()
            await db.commit()
            await db.refresh(project)
            return _project_dict(project, full_name or project.name)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("update_project failed: %s", exc)
        raise HTTPException(status_code=503, detail="Project storage is currently unavailable.")

@router.delete("/projects/{project_id}")
async def delete_project(
    project_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete a project and its runs/findings/cases/app-maps."""
    if not credentials:
        raise HTTPException(status_code=401)

    identity = await _resolve_identity(credentials)
    proj_uuid = _to_uuid(project_id)
    if proj_uuid is None:
        raise HTTPException(status_code=404, detail="Project not found")

    from app.db.session import AsyncSessionLocal
    from sqlalchemy import delete as sa_delete
    from app.models.models import (
        Project, QARun, RunEvent, Finding, AppMap,
    )

    try:
        async with AsyncSessionLocal() as db:
            project = (await db.execute(select(Project).where(Project.id == proj_uuid))).scalar_one_or_none()
            if project is None:
                raise HTTPException(status_code=404, detail="Project not found")
            if identity["organization_id"] and project.organization_id != identity["organization_id"]:
                raise HTTPException(status_code=403, detail="Not your project")

            run_ids_result = await db.execute(select(QARun.id).where(QARun.project_id == proj_uuid))
            run_ids = [row[0] for row in run_ids_result.all()]
            if run_ids:
                finding_ids_result = await db.execute(select(Finding.id).where(Finding.run_id.in_(run_ids)))
                finding_ids = [row[0] for row in finding_ids_result.all()]
                await db.execute(sa_delete(RunEvent).where(RunEvent.run_id.in_(run_ids)))
                await db.execute(sa_delete(AppMap).where(AppMap.run_id.in_(run_ids)))
                if finding_ids:
                    # Clear references first, then delete findings and their cases.
                    from app.models.models import QACase
                    await db.execute(
                        sa_delete(QACase).where(QACase.finding_id.in_(finding_ids))
                    )
                await db.execute(sa_delete(Finding).where(Finding.run_id.in_(run_ids)))
                await db.execute(sa_delete(QARun).where(QARun.project_id == proj_uuid))
            await db.execute(sa_delete(AppMap).where(AppMap.project_id == proj_uuid))
            await db.delete(project)
            await db.commit()
        return {"status": "deleted", "id": project_id}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("delete_project failed: %s", exc)
        raise HTTPException(status_code=503, detail="Project storage is currently unavailable.")

# ============ QA Run Endpoints ============

@router.get("/runs")
async def list_runs(
    project_id: Optional[str] = None,
    status: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """List QA runs (persisted). Runs only exist once execution is started."""
    if not credentials:
        raise HTTPException(status_code=401)

    identity = await _resolve_identity(credentials)
    org_id = identity["organization_id"]
    if org_id is None:
        return {"runs": []}

    from app.db.session import AsyncSessionLocal
    from app.models.models import QARun, Project

    try:
        async with AsyncSessionLocal() as db:
            stmt = (
                select(QARun, Project.name)
                .join(Project, QARun.project_id == Project.id)
                .where(QARun.organization_id == org_id)
                .order_by(QARun.started_at.desc())
            )
            proj_uuid = _to_uuid(project_id)
            if proj_uuid is not None:
                stmt = stmt.where(QARun.project_id == proj_uuid)
            if status:
                stmt = stmt.where(QARun.status == status)
            result = await db.execute(stmt.limit(200))
            runs = [_run_dict(r, name) for (r, name) in result.all()]
        return {"runs": runs}
    except Exception as exc:
        logger.error("list_runs failed: %s", exc)
        raise HTTPException(status_code=503, detail="Run storage is currently unavailable.")

@router.post("/runs", status_code=status.HTTP_202_ACCEPTED)
async def create_run(
    body: QARunCreate,
    background_tasks: BackgroundTasks,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Start a QA run: persist the run record and enqueue it for execution.

    The run row is created here (not when the project was added), so projects
    only appear on the QA Runs page after execution explicitly starts.
    """
    if not credentials:
        raise HTTPException(status_code=401)

    identity = await _resolve_identity(credentials)
    org_id = identity["organization_id"]

    from datetime import datetime
    from app.db.session import AsyncSessionLocal
    from app.models.models import QARun, Project, Repository, RunStatus, Integration, IntegrationVendor

    proj_uuid = _to_uuid(body.project_id)
    if proj_uuid is None or org_id is None:
        raise HTTPException(status_code=404, detail="Project not found")

    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Project, Repository.full_name)
                .outerjoin(Repository, Project.repository_id == Repository.id)
                .where(Project.id == proj_uuid, Project.organization_id == org_id)
            )
            row = result.one_or_none()
            if row is None:
                raise HTTPException(status_code=404, detail="Project not found")
            project, repo_full_name = row

            # --- Required integrations gate (GitHub + selected tracker) ---
            missing: List[str] = []
            if not repo_full_name:
                missing.append("GitHub repository connection")
            jira = (await db.execute(
                select(Integration).where(
                    Integration.organization_id == org_id,
                    Integration.vendor == IntegrationVendor.JIRA,
                    Integration.connected == True,  # noqa: E712
                )
            )).scalar_one_or_none()
            if jira is None:
                missing.append("Jira integration")
            if missing:
                raise HTTPException(
                    status_code=status.HTTP_428_PRECONDITION_REQUIRED,
                    detail=(
                        "Cannot start QA — missing connection(s): " + ", ".join(missing) +
                        ". Connect them on the Integrations/Repositories pages and try again."
                    ),
                )

            qa_config = dict(body.qa_config or {})
            run = QARun(
                id=uuid4(),
                project_id=project.id,
                organization_id=org_id,
                status=RunStatus.QUEUED,
                current_step="Queued",
                progress=0,
                qa_config=qa_config,
                started_at=datetime.utcnow(),
                created_at=datetime.utcnow(),
            )
            db.add(run)
            project.last_run_at = run.started_at
            await db.commit()
            run_id = str(run.id)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("create_run persistence failed: %s", exc)
        raise HTTPException(status_code=503, detail="Run storage is currently unavailable.")

    payload = {
        "run_id": run_id,
        "project_id": body.project_id,
        "organization_id": str(org_id),
        "qa_config": qa_config,
    }
    try:
        await job_queue.enqueue("qa_run", payload, job_id=run_id)
    except Exception as exc:
        logger.error("QA run enqueue failed: %s", exc)
        # Mark the persisted run as failed so the UI never shows a phantom run.
        try:
            from app.models.models import RunStatus as RS
            async with AsyncSessionLocal() as db:
                r = (await db.execute(select(QARun).where(QARun.id == UUID(run_id)))).scalar_one_or_none()
                if r is not None:
                    r.status = RS.ENVIRONMENT_FAILED
                    r.current_step = "Failed"
                    r.error_message = "The job queue is currently unavailable."
                    r.completed_at = datetime.utcnow()
                    await db.commit()
        except Exception:
            logger.exception("Could not mark run %s as failed", run_id)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The job queue is currently unavailable.",
        ) from exc

    return {"id": run_id, "status": "queued", "project_id": body.project_id}

@router.get("/runs/{run_id}")
async def get_run(
    run_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get the current QA run status (database record of truth)."""
    if not credentials:
        raise HTTPException(status_code=401)

    identity = await _resolve_identity(credentials)
    run_uuid = _to_uuid(run_id)
    if run_uuid is None:
        raise HTTPException(status_code=404, detail="QA run not found")

    from app.db.session import AsyncSessionLocal
    from app.models.models import QARun, Project

    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(QARun, Project.name)
                .join(Project, QARun.project_id == Project.id)
                .where(QARun.id == run_uuid)
            )
            row = result.one_or_none()
            if row is None:
                raise HTTPException(status_code=404, detail="QA run not found")
            run, project_name = row
            if identity["organization_id"] and run.organization_id != identity["organization_id"]:
                raise HTTPException(status_code=403, detail="Not your run")
            return _run_dict(run, project_name)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("get_run failed: %s", exc)
        raise HTTPException(status_code=503, detail="Run storage is currently unavailable.")

@router.post("/runs/{run_id}/cancel")
async def cancel_run(
    run_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Stop a queued or running QA run. The worker observes the cancelled
    status at each pipeline step and halts execution there."""
    if not credentials:
        raise HTTPException(status_code=401)

    identity = await _resolve_identity(credentials)
    run_uuid = _to_uuid(run_id)
    if run_uuid is None:
        raise HTTPException(status_code=404, detail="QA run not found")

    from datetime import datetime
    from app.db.session import AsyncSessionLocal
    from app.models.models import QARun, RunStatus

    terminal = {RunStatus.COMPLETED, RunStatus.CANCELLED, RunStatus.BUILD_FAILED,
                RunStatus.PREVIEW_FAILED, RunStatus.ENVIRONMENT_FAILED,
                RunStatus.TIMED_OUT, RunStatus.PARTIAL}
    try:
        async with AsyncSessionLocal() as db:
            run = (await db.execute(select(QARun).where(QARun.id == run_uuid))).scalar_one_or_none()
            if run is None:
                raise HTTPException(status_code=404, detail="QA run not found")
            if identity["organization_id"] and run.organization_id != identity["organization_id"]:
                raise HTTPException(status_code=403, detail="Not your run")
            if run.status in terminal:
                raise HTTPException(status_code=409, detail="This run has already finished")
            run.status = RunStatus.CANCELLED
            run.current_step = "Cancelled"
            run.completed_at = datetime.utcnow()
            await db.commit()
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("cancel_run failed: %s", exc)
        raise HTTPException(status_code=503, detail="Run storage is currently unavailable.")

    # Best-effort: also cancel the queued job so the worker skips it early.
    try:
        await job_queue.cancel_job(run_id)
    except Exception:
        pass

    return {"id": run_id, "status": "cancelled"}

# ============ Bug/Finding Endpoints ============

def _finding_dict(f) -> Dict[str, Any]:
    return {
        "id": str(f.id),
        "runId": str(f.run_id),
        "title": f.title,
        "description": f.description or "",
        "status": getattr(f.status, "value", str(f.status)),
        "severity": getattr(f.severity, "value", str(f.severity)) if f.severity else "medium",
        "confidence": getattr(f.confidence, "value", str(f.confidence)) if f.confidence else "medium",
        "category": f.category or "general",
        "page": f.page or "",
        "route": f.route or "",
        "component": f.component,
        "expectedResult": f.expected_result or "",
        "actualResult": f.actual_result or "",
        "reproductionSteps": f.reproduction_steps or [],
        "evidence": f.evidence or [],
        "createdAt": f.created_at.isoformat() if f.created_at else None,
    }

@router.get("/findings")
async def list_findings(
    run_id: Optional[str] = None,
    status: Optional[str] = None,
    severity: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """List findings/bugs generated by QA runs (tenant isolated)."""
    if not credentials:
        raise HTTPException(status_code=401)

    identity = await _resolve_identity(credentials)
    org_id = identity["organization_id"]
    if org_id is None:
        return {"findings": []}

    from app.db.session import AsyncSessionLocal
    from app.models.models import Finding

    try:
        async with AsyncSessionLocal() as db:
            stmt = select(Finding).where(Finding.organization_id == org_id).order_by(Finding.created_at.desc())
            rid = _to_uuid(run_id)
            if rid is not None:
                stmt = stmt.where(Finding.run_id == rid)
            if status:
                stmt = stmt.where(Finding.status == status)
            if severity:
                stmt = stmt.where(Finding.severity == severity)
            result = await db.execute(stmt.limit(500))
            findings = [_finding_dict(f) for f in result.scalars().all()]
        return {"findings": findings}
    except Exception as exc:
        logger.error("list_findings failed: %s", exc)
        return {"findings": []}

@router.get("/findings/{finding_id}")
async def get_finding(
    finding_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get finding details with evidence"""
    if not credentials:
        raise HTTPException(status_code=401)

    fid = _to_uuid(finding_id)
    if fid is None:
        raise HTTPException(status_code=404, detail="Finding not found")

    from app.db.session import AsyncSessionLocal
    from app.models.models import Finding

    try:
        async with AsyncSessionLocal() as db:
            f = (await db.execute(select(Finding).where(Finding.id == fid))).scalar_one_or_none()
            if f is None:
                raise HTTPException(status_code=404, detail="Finding not found")
            return _finding_dict(f)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("get_finding failed: %s", exc)
        raise HTTPException(status_code=503, detail="Finding storage unavailable.")

# ============ QA Case Endpoints ============

def _qa_case_dict(c) -> Dict[str, Any]:
    return {
        "id": str(c.id),
        "caseNumber": c.case_number,
        "bugId": str(c.finding_id) if c.finding_id else None,
        "title": c.title,
        "severity": getattr(c.severity, "value", str(c.severity)) if c.severity else "medium",
        "priority": c.priority or "P2",
        "category": c.category or "general",
        "page": c.page or "",
        "route": c.route or "",
        "reproductionSteps": c.reproduction_steps or [],
        "expectedResult": c.expected_result or "",
        "actualResult": c.actual_result or "",
        "evidence": c.evidence or [],
        "confidence": getattr(c.confidence, "value", str(c.confidence)) if c.confidence else "medium",
        "deliveredTo": c.delivered_to,
        "externalIssueId": c.external_issue_id,
        "externalIssueUrl": c.external_issue_url,
        "createdAt": c.created_at.isoformat() if c.created_at else None,
    }

@router.get("/qa-cases")
async def list_qa_cases(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """List QA cases produced by completed QA runs (tenant isolated)."""
    if not credentials:
        raise HTTPException(status_code=401)

    identity = await _resolve_identity(credentials)
    org_id = identity["organization_id"]
    if org_id is None:
        return {"qa_cases": []}

    from app.db.session import AsyncSessionLocal
    from app.models.models import QACase

    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(QACase)
                .where(QACase.organization_id == org_id)
                .order_by(QACase.created_at.desc())
                .limit(500)
            )
            cases = [_qa_case_dict(c) for c in result.scalars().all()]
        return {"qa_cases": cases}
    except Exception as exc:
        logger.error("list_qa_cases failed: %s", exc)
        return {"qa_cases": []}

# ============ Integration Endpoints ============

def _integration_dict(i) -> Dict[str, Any]:
    return {
        "id": str(i.id),
        "vendor": getattr(i.vendor, "value", str(i.vendor)),
        "name": i.name,
        "connected": bool(i.connected),
        "workspace": i.workspace,
        "project": i.project,
        "lastSync": i.last_sync.isoformat() if i.last_sync else None,
        "config": i.config or {},
    }

@router.get("/integrations")
async def list_integrations(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """List connected integrations (persisted per organization)."""
    if not credentials:
        raise HTTPException(status_code=401)

    identity = await _resolve_identity(credentials)
    org_id = identity["organization_id"]
    if org_id is None:
        return {"integrations": []}

    from app.db.session import AsyncSessionLocal
    from app.models.models import Integration

    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Integration).where(Integration.organization_id == org_id)
            )
            return {"integrations": [_integration_dict(i) for i in result.scalars().all()]}
    except Exception as exc:
        logger.error("list_integrations failed: %s", exc)
        return {"integrations": []}

@router.post("/integrations/connect")
async def connect_integration(
    body: IntegrationConnect,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Connect an external integration.

    Credentials are validated against the vendor before the connection is
    stored — a successful login to QUALNEX is NOT treated as proof that the
    external integration is authorized.
    """
    if not credentials:
        raise HTTPException(status_code=401)

    identity = await _resolve_identity(credentials)
    org_id = identity["organization_id"]
    if org_id is None:
        raise HTTPException(status_code=503, detail="Account is not linked to an organization yet.")

    from datetime import datetime
    from app.db.session import AsyncSessionLocal
    from app.models.models import Integration, IntegrationVendor

    try:
        vendor_enum = IntegrationVendor(body.vendor)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported integration '{body.vendor}'. Jira is currently the supported issue tracker.",
        )

    config = dict(body.config or {})
    creds = dict(body.credentials or {})
    connected = False
    error_detail: Optional[str] = None
    workspace = config.get("site", "") or config.get("workspace", "")
    project_key = config.get("project_key", "") or config.get("project", "")

    if vendor_enum == IntegrationVendor.JIRA:
        # Validate Jira credentials via the Atlassian REST API before saving.
        try:
            from app.integrations.adapters import JiraIntegration
            adapter = JiraIntegration(creds, config)
            connected = await adapter.test_connection()
            if not connected:
                error_detail = ("Jira authorization failed. Check your site URL, email and API token, "
                                "then authorize again.")
        except Exception as exc:
            logger.warning("Jira validation error: %s", exc)
            error_detail = f"Could not reach Jira: {exc}"
    elif vendor_enum == IntegrationVendor.GITHUB:
        connected = bool(creds.get("token"))
        if not connected:
            error_detail = "No GitHub authorization token supplied."
    else:
        raise HTTPException(
            status_code=400,
            detail=f"{vendor_enum.value} is not implemented yet — it is marked Coming Soon.",
        )

    if not connected:
        raise HTTPException(status_code=400, detail=error_detail or "Integration validation failed.")

    display_names = {v.value: v.value.title() for v in IntegrationVendor}
    try:
        async with AsyncSessionLocal() as db:
            existing = (await db.execute(
                select(Integration).where(
                    Integration.organization_id == org_id,
                    Integration.vendor == vendor_enum,
                )
            )).scalar_one_or_none()
            if existing is None:
                existing = Integration(
                    id=uuid4(),
                    organization_id=org_id,
                    vendor=vendor_enum,
                    name=display_names.get(vendor_enum.value, vendor_enum.value),
                    created_at=datetime.utcnow(),
                )
                db.add(existing)
            existing.connected = True
            existing.config = config
            existing.credentials = json.dumps(creds)  # NOTE: encrypt at rest in production
            existing.workspace = workspace or None
            existing.project = project_key or None
            existing.last_sync = datetime.utcnow()
            existing.updated_at = datetime.utcnow()
            await db.commit()
            await db.refresh(existing)
            return _integration_dict(existing)
    except Exception as exc:
        logger.error("connect_integration failed: %s", exc)
        raise HTTPException(status_code=503, detail="Integration storage is currently unavailable.")

@router.delete("/integrations/{vendor}")
async def disconnect_integration(
    vendor: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Disconnect (remove) an integration for the current organization."""
    if not credentials:
        raise HTTPException(status_code=401)

    identity = await _resolve_identity(credentials)
    org_id = identity["organization_id"]
    if org_id is None:
        raise HTTPException(status_code=503, detail="Account is not linked to an organization yet.")

    from sqlalchemy import delete as sa_delete
    from app.db.session import AsyncSessionLocal
    from app.models.models import Integration

    try:
        vendor_enum = IntegrationVendor(vendor)
    except ValueError:
        raise HTTPException(status_code=400, detail="Unknown integration vendor.")

    try:
        async with AsyncSessionLocal() as db:
            await db.execute(sa_delete(Integration).where(
                Integration.organization_id == org_id,
                Integration.vendor == vendor_enum,
            ))
            await db.commit()
        return {"status": "disconnected", "vendor": vendor}
    except Exception as exc:
        logger.error("disconnect_integration failed: %s", exc)
        raise HTTPException(status_code=503, detail="Integration storage is currently unavailable.")

@router.post("/integrations/{integration_id}/test")
async def test_integration(
    integration_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Test a stored integration connection against the vendor."""
    if not credentials:
        raise HTTPException(status_code=401)

    integ_uuid = _to_uuid(integration_id)
    if integ_uuid is None:
        raise HTTPException(status_code=404, detail="Integration not found")

    from app.db.session import AsyncSessionLocal
    from app.models.models import Integration
    from app.integrations.adapters import IntegrationRouter

    try:
        async with AsyncSessionLocal() as db:
            integ = (await db.execute(select(Integration).where(Integration.id == integ_uuid))).scalar_one_or_none()
            if integ is None:
                raise HTTPException(status_code=404, detail="Integration not found")

            vendor = getattr(integ.vendor, "value", str(integ.vendor))
            creds = json.loads(integ.credentials) if integ.credentials else {}
            router = IntegrationRouter()
            router.register(vendor, creds, integ.config or {})
            adapter = router.adapters.get(vendor)
            if adapter is None:
                return {"status": "error", "detail": f"No adapter for vendor '{vendor}'"}
            ok = await adapter.test_connection()
            return {"status": "ok" if ok else "error", "connected": ok}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("test_integration failed: %s", exc)
        return {"status": "error", "detail": str(exc)}

# ============ Webhook Endpoints ============

@router.post("/webhooks/github")
async def github_webhook(
    body: Dict[str, Any],
    # In production: verify webhook signature
):
    """Handle GitHub App webhooks"""
    event_type = body.get("action", "")
    
    # Handle repository events, push events, etc.
    if event_type == "push":
        # Could trigger automatic QA run on push
        pass
    
    return {"status": "received"}

# ============ App Map Endpoints ============

@router.get("/projects/{project_id}/app-map")
async def get_app_map(
    project_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get the discovered application map for a project.

    Returns the latest persisted map from an actual QA run; when no run has
    produced one yet, performs a live discovery pass over the connected
    GitHub repository so the page always reflects real data."""
    if not credentials:
        raise HTTPException(status_code=401)

    identity = await _resolve_identity(credentials)
    org_id = identity["organization_id"]
    proj_uuid = _to_uuid(project_id)
    if proj_uuid is None or org_id is None:
        return {"nodes": [], "edges": []}

    from app.db.session import AsyncSessionLocal
    from app.models.models import AppMap, Project, Repository

    try:
        async with AsyncSessionLocal() as db:
            stored = (await db.execute(
                select(AppMap)
                .where(AppMap.project_id == proj_uuid)
                .order_by(AppMap.created_at.desc())
                .limit(1)
            )).scalar_one_or_none()
            if stored is not None and (stored.nodes or []):
                return {"nodes": stored.nodes, "edges": stored.edges or [], "source": "run"}

            # No persisted map — discover routes from the repo via GitHub API.
            row = (await db.execute(
                select(Project, Repository)
                .join(Repository, Project.repository_id == Repository.id)
                .where(Project.id == proj_uuid)
            )).one_or_none()
            if row is None:
                return {"nodes": [], "edges": []}
            project, repo = row

            token = None
            try:
                from app.core.token_vault import get_user_token  # type: ignore
                token = get_user_token(str(identity.get("firebase_uid") or ""))
            except Exception:
                token = None

            nodes: List[Dict[str, Any]] = [{"id": "root", "label": project.name, "type": "page", "route": "/"}]
            edges: List[Dict[str, Any]] = []
            if token and repo.full_name:
                try:
                    from app.workers.repo_scan import discover_routes_from_github
                    routes = await discover_routes_from_github(repo.full_name, project.branch or "main", token)
                    for r in routes[:60]:
                        nid = r["path"] or "/"
                        nodes.append({"id": nid, "label": nid, "type": r.get("type", "page"), "route": nid})
                        edges.append({"from": "root", "to": nid})
                    return {"nodes": nodes, "edges": edges, "source": "github-live"}
                except Exception as exc:
                    logger.warning("Live app-map discovery failed for %s: %s", repo.full_name, exc)
            return {"nodes": nodes, "edges": edges, "source": "project"}
    except Exception as exc:
        logger.error("get_app_map failed: %s", exc)
        return {"nodes": [], "edges": []}

# ============ Health & Status ============

@router.get("/health")
async def health():
    """Health check"""
    return {"status": "healthy"}

@router.get("/metrics")
async def metrics():
    """Prometheus-compatible metrics endpoint"""
    # In production: expose real metrics
    return {
        "active_runs": 0,
        "queue_depth": 0,
        "worker_count": 0,
    }
