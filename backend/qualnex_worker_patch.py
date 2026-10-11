from __future__ import annotations

import re
import shutil
from pathlib import Path

ROOT = Path.cwd()
FILES = {
    "executor": ROOT / "app" / "workers" / "executor.py",
    "routes": ROOT / "app" / "api" / "v1" / "routes.py",
    "main": ROOT / "app" / "main.py",
}

QUEUE_CLASS = '''class JobQueue:
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


'''


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"Expected exactly one match for {label}; found {count}. No files were changed yet.")
    return text.replace(old, new, 1)


def main() -> None:
    missing = [str(path) for path in FILES.values() if not path.is_file()]
    if missing:
        raise SystemExit(
            "Run this script from your backend directory. Missing file(s):\n  " + "\n  ".join(missing)
        )

    original = {name: path.read_text(encoding="utf-8") for name, path in FILES.items()}
    patched = dict(original)

    # executor.py: redis dependency import
    if "from redis.asyncio import Redis" not in patched["executor"]:
        patched["executor"] = replace_once(
            patched["executor"],
            "from app.config import settings\n",
            "from app.config import settings\nfrom redis.asyncio import Redis\n",
            "executor Redis import",
        )

    # Add the explicit queued state to the enum.
    if "    QUEUED = \"queued\"" not in patched["executor"]:
        patched["executor"] = replace_once(
            patched["executor"],
            'class JobStatus(str, Enum):\n    PENDING = "pending"\n',
            'class JobStatus(str, Enum):\n    QUEUED = "queued"\n    PENDING = "pending"\n',
            "JobStatus queued value",
        )

    start = patched["executor"].find("class JobQueue:")
    end_marker = "# ============ QA Run Worker ============"
    end = patched["executor"].find(end_marker, start)
    if start < 0 or end < 0:
        raise RuntimeError("Could not locate JobQueue class boundaries; no files were changed.")
    patched["executor"] = patched["executor"][:start] + QUEUE_CLASS + patched["executor"][end:]

    # Make the current scaffold explicitly fail rather than claim tests passed with an empty plan/results.
    old_return = '        return {"status": "completed", "run_id": run_id}\n'
    new_return = '''        if not context.get("test_plan") or not context.get("test_results"):
            return {
                "status": "failed",
                "step": "testing",
                "error": "No real test plan/results were produced. The QA execution pipeline still contains placeholder implementations; this run must not be reported as passed.",
            }
        return {"status": "completed", "run_id": run_id}
'''
    if "The QA execution pipeline still contains placeholder implementations" not in patched["executor"]:
        patched["executor"] = replace_once(patched["executor"], old_return, new_return, "honest QA result guard")

    worker_entrypoint = '''\n\n# Shared queue instance in this process. The API has its own process-local instance.
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
'''
    if "async def worker_main():" not in patched["executor"]:
        patched["executor"] = patched["executor"].rstrip() + worker_entrypoint + "\n"

    # routes.py: imports
    if "from app.workers.executor import job_queue" not in patched["routes"]:
        patched["routes"] = replace_once(
            patched["routes"],
            "from uuid import UUID\n",
            "from uuid import UUID, uuid4\n\nfrom app.workers.executor import job_queue\n",
            "routes job queue import",
        )

    # Replace create_run block up to get_run decorator.
    routes_text = patched["routes"]
    run_start = routes_text.find('@router.post("/runs")')
    run_end = routes_text.find('@router.get("/runs/{run_id}")', run_start)
    if run_start < 0 or run_end < 0:
        raise RuntimeError("Could not locate create_run route boundaries; no files were changed.")
    create_run_block = '''@router.post("/runs", status_code=status.HTTP_202_ACCEPTED)
async def create_run(
    body: QARunCreate,
    background_tasks: BackgroundTasks,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Queue a QA run in Redis and return its persistent ID."""
    if not credentials:
        raise HTTPException(status_code=401)

    run_id = str(uuid4())
    payload = {
        "run_id": run_id,
        "project_id": body.project_id,
        "organization_id": "",
        "qa_config": body.qa_config,
    }
    try:
        await job_queue.enqueue("qa_run", payload, job_id=run_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The job queue is currently unavailable.",
        ) from exc

    return {"id": run_id, "status": "queued", "project_id": body.project_id}

'''
    patched["routes"] = routes_text[:run_start] + create_run_block + routes_text[run_end:]

    # Replace get_run and cancel_run to use persistent Redis state.
    get_start = patched["routes"].find('@router.get("/runs/{run_id}")')
    get_end = patched["routes"].find("# ============ Bug/Finding Endpoints ============", get_start)
    if get_start < 0 or get_end < 0:
        raise RuntimeError("Could not locate get/cancel run route boundaries; no files were changed.")
    status_cancel_block = '''@router.get("/runs/{run_id}")
async def get_run(
    run_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get the current persisted QA job status."""
    if not credentials:
        raise HTTPException(status_code=401)
    try:
        run = await job_queue.get_job_status(run_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The job queue is currently unavailable.",
        ) from exc
    if run is None:
        raise HTTPException(status_code=404, detail="QA run not found")
    return run

@router.post("/runs/{run_id}/cancel")
async def cancel_run(
    run_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Cancel a queued run. Already running jobs are not forcibly interrupted."""
    if not credentials:
        raise HTTPException(status_code=401)
    try:
        run = await job_queue.get_job_status(run_id)
        if run is None:
            raise HTTPException(status_code=404, detail="QA run not found")
        cancelled = await job_queue.cancel_job(run_id)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The job queue is currently unavailable.",
        ) from exc
    if not cancelled:
        raise HTTPException(status_code=409, detail="This run is already running or has finished")
    return {"id": run_id, "status": "cancelled"}

'''
    patched["routes"] = patched["routes"][:get_start] + status_cancel_block + patched["routes"][get_end:]

    # main.py: ensure the API closes its process-local Redis client at shutdown.
    if "from app.workers.executor import job_queue" not in patched["main"]:
        patched["main"] = replace_once(
            patched["main"],
            "from app.api.v1 import router as api_v1_router\n",
            "from app.api.v1 import router as api_v1_router\nfrom app.workers.executor import job_queue\n",
            "main queue import",
        )
    if "await job_queue.disconnect()" not in patched["main"]:
        patched["main"] = replace_once(
            patched["main"],
            '    logger.info("Shutting down QUALNEX API...")\n    await engine.dispose()\n',
            '    logger.info("Shutting down QUALNEX API...")\n    await job_queue.disconnect()\n    await engine.dispose()\n',
            "main queue shutdown",
        )

    # All matching is complete. Create backups, then write all patched files.
    for name, path in FILES.items():
        backup = path.with_suffix(path.suffix + ".before_redis_worker_patch.bak")
        if not backup.exists():
            shutil.copy2(path, backup)
    for name, path in FILES.items():
        path.write_text(patched[name], encoding="utf-8", newline="\n")

    print("Patch applied successfully.")
    print("Backups created with suffix: .before_redis_worker_patch.bak")
    print("Changed files:")
    for path in FILES.values():
        print(f" - {path.relative_to(ROOT)}")
    print("\nImportant: Redis queue wiring is now real, but the QA executor still has placeholder stages.")
    print("Runs without real test plans/results will be marked failed instead of falsely marked completed.")
    print("Next: rebuild the API and worker images, then verify logs and POST/GET /api/v1/runs.")


if __name__ == "__main__":
    main()
