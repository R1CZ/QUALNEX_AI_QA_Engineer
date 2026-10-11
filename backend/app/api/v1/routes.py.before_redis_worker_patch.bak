"""
API V1 Routes - All endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
from uuid import UUID
import secrets

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
    user_data = await get_or_create_user(firebase_user)
    
    # Create backend session token (JWT)
    token = create_access_token({
        "sub": user_data["id"],
        "email": user_data["email"],
        "role": user_data["role"],
        "organization_id": user_data["organizationId"],
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
    
    # In production: fetch full user from database
    return {
        "id": payload.get("sub"),
        "email": payload.get("email"),
        "provider": payload.get("provider"),
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
    """List all projects for the current organization"""
    if not credentials:
        raise HTTPException(status_code=401)
    
    # In production: query projects WHERE organization_id = current_user.org_id
    return {"projects": []}

@router.post("/projects")
async def create_project(
    body: ProjectCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a new QA project"""
    if not credentials:
        raise HTTPException(status_code=401)
    
    # In production: validate repo access, create project in database
    # Verify tenant isolation: user must belong to the organization
    return {
        "id": "prj_new",
        "name": body.name,
        "status": "active",
        "repository": body.repository_id,
        "branch": body.branch,
    }

# ============ QA Run Endpoints ============

@router.get("/runs")
async def list_runs(
    project_id: Optional[str] = None,
    status: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """List QA runs"""
    if not credentials:
        raise HTTPException(status_code=401)
    
    # In production: query runs with tenant isolation
    return {"runs": []}

@router.post("/runs")
async def create_run(
    body: QARunCreate,
    background_tasks: BackgroundTasks,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Start a new QA run"""
    if not credentials:
        raise HTTPException(status_code=401)
    
    # In production:
    # 1. Validate project exists and user has access
    # 2. Create run record in database
    # 3. Enqueue job in Redis
    # 4. Return run ID
    
    # Rate limiting check
    # await check_rate_limit("qa_runs", credentials.credentials)
    
    return {
        "id": "run_new",
        "status": "queued",
        "project_id": body.project_id,
    }

@router.get("/runs/{run_id}")
async def get_run(
    run_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get QA run details"""
    if not credentials:
        raise HTTPException(status_code=401)
    
    # In production: query run with tenant isolation
    return {"id": run_id, "status": "queued"}

@router.post("/runs/{run_id}/cancel")
async def cancel_run(
    run_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Cancel a running QA execution"""
    if not credentials:
        raise HTTPException(status_code=401)
    
    # In production: update run status, cancel worker job
    return {"status": "cancelled"}

# ============ Bug/Finding Endpoints ============

@router.get("/findings")
async def list_findings(
    run_id: Optional[str] = None,
    status: Optional[str] = None,
    severity: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """List findings/bugs"""
    if not credentials:
        raise HTTPException(status_code=401)
    
    # In production: query findings with tenant isolation
    return {"findings": []}

@router.get("/findings/{finding_id}")
async def get_finding(
    finding_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get finding details with evidence"""
    if not credentials:
        raise HTTPException(status_code=401)
    
    return {"id": finding_id}

# ============ QA Case Endpoints ============

@router.get("/qa-cases")
async def list_qa_cases(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """List QA cases"""
    if not credentials:
        raise HTTPException(status_code=401)
    
    return {"qa_cases": []}

# ============ Integration Endpoints ============

@router.get("/integrations")
async def list_integrations(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """List connected integrations"""
    if not credentials:
        raise HTTPException(status_code=401)
    
    return {"integrations": []}

@router.post("/integrations/connect")
async def connect_integration(
    body: IntegrationConnect,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Connect an external integration"""
    if not credentials:
        raise HTTPException(status_code=401)
    
    # In production:
    # 1. Validate credentials
    # 2. Encrypt and store credentials
    # 3. Test connection
    # 4. Store configuration
    return {"status": "connected", "vendor": body.vendor}

@router.post("/integrations/{integration_id}/test")
async def test_integration(
    integration_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Test an integration connection"""
    if not credentials:
        raise HTTPException(status_code=401)
    
    return {"status": "ok"}

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
    """Get the discovered application map for a project"""
    if not credentials:
        raise HTTPException(status_code=401)
    
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
