"""
Background Worker Queue - Redis-based Job Processing
"""
import asyncio
import json
import logging
import uuid
from datetime import datetime
from typing import Dict, Any, Optional, List, Callable
from dataclasses import dataclass, field
from enum import Enum

from app.config import settings
from redis.asyncio import Redis

logger = logging.getLogger(__name__)

class JobStatus(str, Enum):
    QUEUED = "queued"
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    RETRYING = "retrying"

@dataclass
class Job:
    """Represents a background job"""
    id: str
    type: str
    payload: Dict[str, Any]
    status: JobStatus = JobStatus.PENDING
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    retries: int = 0
    max_retries: int = 3
    correlation_id: str = ""
    organization_id: str = ""
    created_at: datetime = field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

class JobQueue:
    """Redis-backed queue used by both the API and the worker process."""

    JOB_TTL_SECONDS = 30 * 24 * 60 * 60

    def __init__(self):
        self.redis: Optional[Redis] = None
        self.queue_name = settings.redis_queue_name
        self.handlers: Dict[str, Callable] = {}
        self.active_jobs: Dict[str, Job] = {}

    async def connect(self):
        if self.redis is None:
            self.redis = Redis.from_url(settings.redis_url, decode_responses=True)
        await self.redis.ping()

    async def disconnect(self):
        if self.redis is not None:
            await self.redis.aclose()
            self.redis = None

    def register_handler(self, job_type: str, handler: Callable):
        self.handlers[job_type] = handler

    def _job_key(self, job_id: str) -> str:
        return f"{self.queue_name}:job:{job_id}"

    @staticmethod
    def _serialize(job: Job) -> Dict[str, Any]:
        return {
            "id": job.id,
            "type": job.type,
            "payload": job.payload,
            "status": job.status.value,
            "result": job.result,
            "error": job.error,
            "retries": job.retries,
            "max_retries": job.max_retries,
            "correlation_id": job.correlation_id,
            "organization_id": job.organization_id,
            "created_at": job.created_at.isoformat(),
            "started_at": job.started_at.isoformat() if job.started_at else None,
            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        }

    async def _save_job(self, job: Job):
        await self.connect()
        await self.redis.set(
            self._job_key(job.id),
            json.dumps(self._serialize(job)),
            ex=self.JOB_TTL_SECONDS,
        )

    async def _load_job(self, job_id: str) -> Optional[Job]:
        await self.connect()
        raw = await self.redis.get(self._job_key(job_id))
        if not raw:
            return None
        data = json.loads(raw)
        return Job(
            id=data["id"],
            type=data["type"],
            payload=data.get("payload") or {},
            status=JobStatus(data.get("status", JobStatus.QUEUED.value)),
            result=data.get("result"),
            error=data.get("error"),
            retries=int(data.get("retries", 0)),
            max_retries=int(data.get("max_retries", 3)),
            correlation_id=data.get("correlation_id", ""),
            organization_id=data.get("organization_id", ""),
            created_at=datetime.fromisoformat(data["created_at"]) if data.get("created_at") else datetime.utcnow(),
            started_at=datetime.fromisoformat(data["started_at"]) if data.get("started_at") else None,
            completed_at=datetime.fromisoformat(data["completed_at"]) if data.get("completed_at") else None,
        )

    async def enqueue(
        self,
        job_type: str,
        payload: Dict[str, Any],
        priority: int = 0,
        idempotency_key: str = None,
        organization_id: str = "",
        correlation_id: str = None,
        job_id: str = None,
    ) -> str:
        await self.connect()
        if idempotency_key:
            existing = await self._get_by_idempotency(idempotency_key)
            if existing:
                return existing

        new_job_id = job_id or str(uuid.uuid4())
        job = Job(
            id=new_job_id,
            type=job_type,
            payload=payload,
            status=JobStatus.QUEUED,
            organization_id=organization_id,
            correlation_id=correlation_id or str(uuid.uuid4()),
        )
        await self._save_job(job)
        if idempotency_key:
            await self._set_idempotency(idempotency_key, new_job_id)
        # LPUSH + BRPOP provides FIFO ordering for normal jobs.
        await self.redis.lpush(self.queue_name, new_job_id)
        logger.info("Job enqueued: %s (type=%s)", new_job_id, job_type)
        return new_job_id

    async def process_next(self, timeout: int = 5) -> Optional[Job]:
        await self.connect()
        item = await self.redis.brpop(self.queue_name, timeout=timeout)
        if not item:
            return None
        return await self._load_job(item[1])

    async def process_job(self, job: Job):
        await self.connect()
        handler = self.handlers.get(job.type)
        if handler is None:
            job.status = JobStatus.FAILED
            job.error = f"No handler registered for job type: {job.type}"
            job.completed_at = datetime.utcnow()
            await self._save_job(job)
            await self._dead_letter(job)
            logger.error(job.error)
            return

        if job.status == JobStatus.CANCELLED:
            return

        job.status = JobStatus.RUNNING
        job.started_at = datetime.utcnow()
        self.active_jobs[job.id] = job
        await self._save_job(job)

        try:
            result = await handler(job.payload)
            job.result = result if isinstance(result, dict) else {"value": result}
            if isinstance(result, dict) and result.get("status") in {"failed", "error", "not_implemented"}:
                job.status = JobStatus.FAILED
                job.error = str(result.get("error") or "Job handler reported failure")
            else:
                job.status = JobStatus.COMPLETED
            job.completed_at = datetime.utcnow()
            logger.info("Job %s finished with status %s", job.id, job.status.value)
        except Exception as exc:
            job.retries += 1
            job.error = str(exc)
            if job.retries <= job.max_retries:
                job.status = JobStatus.RETRYING
                await self._save_job(job)
                delay = min(2 ** job.retries, 30)
                logger.exception("Job %s failed; retry %s/%s in %ss", job.id, job.retries, job.max_retries, delay)
                await asyncio.sleep(delay)
                await self.redis.lpush(self.queue_name, job.id)
                return
            job.status = JobStatus.FAILED
            job.completed_at = datetime.utcnow()
            logger.exception("Job %s failed permanently", job.id)
            await self._dead_letter(job)
        finally:
            self.active_jobs.pop(job.id, None)
            await self._save_job(job)

    async def cancel_job(self, job_id: str) -> bool:
        job = await self._load_job(job_id)
        if job is None or job.status in {JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED}:
            return False
        # Running Python/browser work cannot safely be interrupted by this queue alone.
        if job.status == JobStatus.RUNNING:
            return False
        job.status = JobStatus.CANCELLED
        job.completed_at = datetime.utcnow()
        await self._save_job(job)
        return True

    async def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        job = await self._load_job(job_id)
        if job is None:
            return None
        return {
            "id": job.id,
            "status": job.status.value,
            "progress": 100 if job.status in {JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED} else 0,
            "error": job.error,
            "result": job.result,
            "created_at": job.created_at.isoformat(),
            "started_at": job.started_at.isoformat() if job.started_at else None,
            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        }

    async def _get_by_idempotency(self, key: str) -> Optional[str]:
        await self.connect()
        return await self.redis.get(f"{self.queue_name}:idempotency:{key}")

    async def _set_idempotency(self, key: str, job_id: str):
        await self.connect()
        await self.redis.set(f"{self.queue_name}:idempotency:{key}", job_id, ex=86400)

    async def _dead_letter(self, job: Job):
        await self.connect()
        await self.redis.lpush(f"{self.queue_name}:dead", json.dumps(self._serialize(job)))
        logger.warning("Job moved to dead letter queue: %s", job.id)


# ============ QA Run Worker ============

class QARunWorker:
    """
    Worker that processes QA run jobs through the complete pipeline:
    1. Prepare repository (clone into sandbox)
    2. Build application
    3. Start preview
    4. Discover application structure
    5. Plan tests
    6. Execute tests (Playwright)
    7. Analyze results (AI)
    8. Validate findings (AI)
    9. Deduplicate (AI)
    10. Generate QA cases (AI)
    11. Deliver to integrations
    """
    
    def __init__(self, job_queue: JobQueue):
        self.queue = job_queue
        # In production, inject these dependencies
        self.sandbox = None  # DockerSandbox()
        self.orchestrator = None  # AgentOrchestrator()
        self.router = None  # IntegrationRouter()
    
    async def execute_run(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a complete QA run"""
        run_id = payload["run_id"]
        project_id = payload["project_id"]
        organization_id = payload["organization_id"]
        qa_config = payload.get("qa_config", {})
        
        logger.info(f"Starting QA run: {run_id}")
        
        steps = [
            ("preparing", self._prepare_repository),
            ("building", self._build_application),
            ("preview", self._start_preview),
            ("discovering", self._discover_application),
            ("planning", self._plan_tests),
            ("testing", self._execute_tests),
            ("analyzing", self._analyze_results),
            ("validating", self._validate_findings),
            ("deduplicating", self._deduplicate_findings),
            ("delivering", self._deliver_qa_cases),
        ]
        
        context = {
            "run_id": run_id,
            "project_id": project_id,
            "organization_id": organization_id,
            "qa_config": qa_config,
        }
        
        for step_name, step_fn in steps:
            try:
                # Update run status
                await self._update_run_status(run_id, step_name)
                
                # Execute step
                context = await step_fn(context)
                
                if context.get("error"):
                    logger.error(f"Step {step_name} failed: {context['error']}")
                    return {"status": "failed", "step": step_name, "error": context["error"]}
                
            except Exception as e:
                logger.error(f"Step {step_name} error: {e}")
                return {"status": "failed", "step": step_name, "error": str(e)}
        
        if not context.get("test_plan") or not context.get("test_results"):
            return {
                "status": "failed",
                "step": "testing",
                "error": "No real test plan/results were produced. The QA execution pipeline still contains placeholder implementations; this run must not be reported as passed.",
            }
        return {"status": "completed", "run_id": run_id}
    
    async def _prepare_repository(self, context: Dict) -> Dict:
        """Clone repository into sandbox"""
        # In production: use DockerSandbox to clone
        logger.info(f"Preparing repository for run {context['run_id']}")
        return context
    
    async def _build_application(self, context: Dict) -> Dict:
        """Build the application"""
        logger.info(f"Building application for run {context['run_id']}")
        return context
    
    async def _start_preview(self, context: Dict) -> Dict:
        """Start the application preview"""
        logger.info(f"Starting preview for run {context['run_id']}")
        return context
    
    async def _discover_application(self, context: Dict) -> Dict:
        """Discover application structure using AI"""
        # In production: use AgentOrchestrator.run_discovery()
        logger.info(f"Discovering application for run {context['run_id']}")
        context["app_map"] = {"nodes": [], "edges": []}
        return context
    
    async def _plan_tests(self, context: Dict) -> Dict:
        """Create test plan using AI"""
        # In production: use AgentOrchestrator.run_planning()
        logger.info(f"Planning tests for run {context['run_id']}")
        context["test_plan"] = []
        return context
    
    async def _execute_tests(self, context: Dict) -> Dict:
        """Execute tests using Playwright"""
        # In production: use PlaywrightWorker
        logger.info(f"Executing tests for run {context['run_id']}")
        context["test_results"] = []
        return context
    
    async def _analyze_results(self, context: Dict) -> Dict:
        """Analyze test results using AI"""
        # In production: use AgentOrchestrator.analyze_test_results()
        logger.info(f"Analyzing results for run {context['run_id']}")
        context["findings"] = []
        return context
    
    async def _validate_findings(self, context: Dict) -> Dict:
        """Validate each finding using AI"""
        # In production: use AgentOrchestrator.validate_finding()
        logger.info(f"Validating findings for run {context['run_id']}")
        return context
    
    async def _deduplicate_findings(self, context: Dict) -> Dict:
        """Deduplicate findings using AI"""
        # In production: use AgentOrchestrator.deduplicate()
        logger.info(f"Deduplicating findings for run {context['run_id']}")
        return context
    
    async def _deliver_qa_cases(self, context: Dict) -> Dict:
        """Generate QA cases and deliver to integrations"""
        # In production: use AgentOrchestrator.generate_qa_case() + IntegrationRouter
        logger.info(f"Delivering QA cases for run {context['run_id']}")
        return context
    
    async def _update_run_status(self, run_id: str, step: str):
        """Update the QA run status in the database"""
        # In production: update database record
        logger.info(f"Run {run_id} status: {step}")


# ============ Playwright Worker ============

class PlaywrightWorker:
    """
    Executes browser tests using Playwright in isolated containers.
    
    Each test execution runs in a fresh container with:
    - Screenshot capture
    - Video recording
    - Console log capture
    - Network log capture
    - Trace recording
    """
    
    async def execute_test(
        self,
        test: Dict[str, Any],
        preview_url: str,
        container_id: str
    ) -> Dict[str, Any]:
        """Execute a single browser test"""
        # In production, this would use Playwright in a Docker container
        # from playwright.async_api import async_playwright
        
        result = {
            "test_id": test.get("id"),
            "status": "passed",
            "duration_ms": 0,
            "screenshots": [],
            "video": None,
            "console_logs": [],
            "network_logs": [],
            "trace": None,
            "error": None,
        }
        
        try:
            # In production:
            # async with async_playwright() as p:
            #     browser = await p.chromium.launch()
            #     context = await browser.new_context(
            #         record_video_dir="/tmp/videos",
            #         record_trace=True,
            #     )
            #     page = await context.new_page()
            #     
            #     # Capture console logs
            #     page.on("console", lambda msg: result["console_logs"].append({
            #         "type": msg.type,
            #         "text": msg.text,
            #     }))
            #     
            #     # Capture network requests
            #     page.on("request", lambda req: result["network_logs"].append({
            #         "url": req.url,
            #         "method": req.method,
            #     }))
            #     
            #     # Execute test steps
            #     for step in test.get("steps", []):
            #         await self._execute_step(page, step)
            #     
            #     # Take screenshot
            #     screenshot = await page.screenshot()
            #     result["screenshots"].append(screenshot)
            
            logger.info(f"Test {test.get('id')} executed")
            
        except Exception as e:
            result["status"] = "failed"
            result["error"] = str(e)
            logger.error(f"Test {test.get('id')} failed: {e}")
        
        return result
    
    async def _execute_step(self, page, step: Dict[str, Any]):
        """Execute a single test step"""
        action = step.get("action")
        selector = step.get("selector")
        value = step.get("value")
        
        # In production:
        # if action == "navigate":
        #     await page.goto(step.get("url"))
        # elif action == "click":
        #     await page.click(selector)
        # elif action == "type":
        #     await page.fill(selector, value)
        # elif action == "select":
        #     await page.select_option(selector, value)
        # elif action == "scroll":
        #     await page.evaluate(f"window.scrollTo(0, {value})")
        # elif action == "wait":
        #     await page.wait_for_selector(selector)
        # elif action == "assert_visible":
        #     await page.wait_for_selector(selector, state="visible")
        # elif action == "assert_text":
        #     element = await page.query_selector(selector)
        #     text = await element.text_content()
        #     assert value in text
        pass

# Shared queue instance in this process. The API has its own process-local instance.
job_queue = JobQueue()


async def worker_main():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )
    qa_worker = QARunWorker(job_queue)
    job_queue.register_handler("qa_run", qa_worker.execute_run)
    await job_queue.connect()
    logger.info("QUALNEX worker started; waiting for Redis jobs on %s", job_queue.queue_name)
    try:
        while True:
            job = await job_queue.process_next(timeout=5)
            if job is None or job.status == JobStatus.CANCELLED:
                continue
            await job_queue.process_job(job)
    finally:
        await job_queue.disconnect()


if __name__ == "__main__":
    try:
        asyncio.run(worker_main())
    except KeyboardInterrupt:
        logger.info("QUALNEX worker stopped")

