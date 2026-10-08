"""
Docker Sandbox Orchestrator - Secure Isolated Execution
"""
import asyncio
import logging
import uuid
from typing import Dict, Optional, List, Any
from dataclasses import dataclass

from app.config import settings

logger = logging.getLogger(__name__)

@dataclass
class SandboxConfig:
    """Configuration for a sandbox execution environment"""
    image: str
    cpu_limit: float
    memory_limit: str
    timeout: int
    network_restricted: bool = True
    read_only_fs: bool = True
    drop_capabilities: bool = True
    non_root: bool = True

@dataclass
class SandboxResult:
    """Result of sandbox execution"""
    success: bool
    container_id: Optional[str]
    output: str
    error: Optional[str]
    exit_code: int
    logs: List[str]
    artifacts: Dict[str, str]  # name -> URL/path
    duration_ms: float

class DockerSandbox:
    """
    Manages secure, isolated Docker containers for executing customer code.
    
    Security measures:
    - Non-root execution
    - Dropped Linux capabilities
    - Read-only base filesystem
    - Restricted network (no access to host, metadata, private ranges)
    - CPU/memory limits
    - Execution timeouts
    - No Docker socket access
    - No host filesystem mounts
    - Ephemeral storage with automatic cleanup
    """
    
    def __init__(self):
        self.active_containers: Dict[str, Dict] = {}
        self.max_concurrent = settings.sandbox_max_concurrent
    
    async def create_sandbox(
        self,
        project_id: str,
        build_command: str,
        start_command: str,
        repo_archive_url: str,
        env_vars: Dict[str, str] = None
    ) -> SandboxResult:
        """
        Create a sandboxed environment for building and running customer code.
        
        In production, this uses the Docker SDK for Python.
        This is a reference implementation showing the security architecture.
        """
        container_id = f"qnex-{project_id}-{uuid.uuid4().hex[:8]}"
        
        try:
            # In production, this would use docker-py:
            # import docker
            # client = docker.from_env()
            
            container_config = {
                "name": container_id,
                "image": settings.sandbox_image,
                "detach": True,
                
                # Security: Resource limits
                "cpu_period": 100000,
                "cpu_quota": int(settings.sandbox_cpu_limit * 100000),
                "mem_limit": settings.sandbox_memory_limit,
                "pids_limit": 256,
                
                # Security: Non-root
                "user": "1000:1000",
                
                # Security: Read-only filesystem
                "read_only": True,
                "tmpfs": {
                    "/tmp": "size=100m",
                    "/app/node_modules": "size=500m",
                    "/app/.cache": "size=200m",
                },
                
                # Security: Drop all capabilities
                "cap_drop": ["ALL"],
                
                # Security: Seccomp profile
                "security_opt": [
                    "no-new-privileges:true",
                    "seccomp=unconfined",  # In production, use custom seccomp profile
                ],
                
                # Security: Network restrictions
                "network": settings.sandbox_network,
                
                # Security: No privileged mode
                "privileged": False,
                
                # Environment variables (customer-provided, not platform secrets)
                "environment": {
                    "NODE_ENV": "production",
                    "CI": "true",
                    **(env_vars or {})
                },
                
                # Working directory
                "working_dir": "/app",
            }
            
            # In production:
            # container = client.containers.run(**container_config)
            
            logger.info(f"Sandbox created: {container_id}")
            
            self.active_containers[container_id] = {
                "project_id": project_id,
                "created_at": asyncio.get_event_loop().time(),
                "config": container_config,
            }
            
            # Step 1: Clone repository into container
            clone_result = await self._exec_in_container(
                container_id,
                f"curl -sL {repo_archive_url} | tar xz -C /app --strip-components=1"
            )
            
            if not clone_result["success"]:
                return SandboxResult(
                    success=False,
                    container_id=container_id,
                    output="",
                    error=f"Failed to clone repository: {clone_result.get('error')}",
                    exit_code=1,
                    logs=[],
                    artifacts={},
                    duration_ms=0
                )
            
            # Step 2: Install dependencies
            install_result = await self._exec_in_container(
                container_id,
                "npm ci --production=false 2>&1 || yarn install --frozen-lockfile 2>&1"
            )
            
            # Step 3: Build
            build_result = await self._exec_in_container(
                container_id,
                build_command
            )
            
            if not build_result["success"]:
                return SandboxResult(
                    success=False,
                    container_id=container_id,
                    output=build_result.get("output", ""),
                    error=f"Build failed: {build_result.get('error', 'Unknown error')}",
                    exit_code=build_result.get("exit_code", 1),
                    logs=build_result.get("logs", []),
                    artifacts={},
                    duration_ms=0
                )
            
            # Step 4: Start application
            start_result = await self._exec_in_container(
                container_id,
                f"{start_command} &",
                background=True
            )
            
            # Step 5: Health check
            healthy = await self._health_check(container_id)
            
            if not healthy:
                return SandboxResult(
                    success=False,
                    container_id=container_id,
                    output="",
                    error="Application failed health check",
                    exit_code=1,
                    logs=[],
                    artifacts={},
                    duration_ms=0
                )
            
            return SandboxResult(
                success=True,
                container_id=container_id,
                output="Application started successfully",
                error=None,
                exit_code=0,
                logs=build_result.get("logs", []),
                artifacts={"preview_url": f"http://{container_id}:3000"},
                duration_ms=0
            )
            
        except asyncio.TimeoutError:
            await self.destroy_sandbox(container_id)
            return SandboxResult(
                success=False,
                container_id=container_id,
                output="",
                error="Sandbox execution timed out",
                exit_code=-1,
                logs=[],
                artifacts={},
                duration_ms=settings.sandbox_timeout * 1000
            )
        except Exception as e:
            logger.error(f"Sandbox error: {e}")
            await self.destroy_sandbox(container_id)
            return SandboxResult(
                success=False,
                container_id=container_id,
                output="",
                error=str(e),
                exit_code=-1,
                logs=[],
                artifacts={},
                duration_ms=0
            )
    
    async def _exec_in_container(
        self,
        container_id: str,
        command: str,
        background: bool = False,
        timeout: int = None
    ) -> Dict[str, Any]:
        """Execute a command inside the sandbox container"""
        # In production, uses Docker SDK exec API
        # docker exec container_id command
        
        # SSRF protection: validate command doesn't access internal resources
        blocked_patterns = [
            "169.254.169.254",  # AWS metadata
            "metadata.google",  # GCP metadata
            "10.", "172.16.", "192.168.",  # Private ranges
            "localhost", "127.0.0.1",
        ]
        
        for pattern in blocked_patterns:
            if pattern in command:
                return {
                    "success": False,
                    "error": f"Blocked: command attempts to access {pattern}",
                    "exit_code": 1,
                    "logs": [],
                }
        
        # In production:
        # exec_result = container.exec_run(command, ...)
        
        return {
            "success": True,
            "output": "Command executed",
            "exit_code": 0,
            "logs": [f"$ {command}", "OK"],
        }
    
    async def _health_check(self, container_id: str, retries: int = 10) -> bool:
        """Check if the application in the sandbox is healthy"""
        for i in range(retries):
            try:
                # In production: HTTP request to container's health endpoint
                await asyncio.sleep(2)
                # health = await client.get(f"http://{container_id}:3000/health")
                return True  # Simplified
            except Exception:
                await asyncio.sleep(2)
        return False
    
    async def destroy_sandbox(self, container_id: str):
        """Destroy a sandbox and clean up all resources"""
        try:
            # In production:
            # container = client.containers.get(container_id)
            # container.stop(timeout=5)
            # container.remove(force=True)
            
            self.active_containers.pop(container_id, None)
            logger.info(f"Sandbox destroyed: {container_id}")
        except Exception as e:
            logger.error(f"Error destroying sandbox {container_id}: {e}")
    
    async def cleanup_all(self):
        """Cleanup all active sandboxes (shutdown hook)"""
        for container_id in list(self.active_containers.keys()):
            await self.destroy_sandbox(container_id)
    
    async def get_logs(self, container_id: str) -> List[str]:
        """Get container logs"""
        # In production: container.logs()
        return []
    
    async def get_screenshot(self, container_id: str, url: str) -> bytes:
        """Take a screenshot of the running application"""
        # This would use a separate Playwright container to screenshot
        return b""


class NetworkPolicy:
    """
    SSRF Protection - Network-level restrictions for sandbox containers.
    
    Prevents access to:
    - Cloud metadata endpoints (169.254.169.254)
    - Private IP ranges (10.x, 172.16.x, 192.168.x)
    - Loopback addresses
    - Internal infrastructure
    """
    
    BLOCKED_RANGES = [
        "169.254.0.0/16",   # Link-local / metadata
        "10.0.0.0/8",       # Private
        "172.16.0.0/12",    # Private
        "192.168.0.0/16",   # Private
        "127.0.0.0/8",      # Loopback
        "0.0.0.0/8",        # Current network
    ]
    
    ALLOWED_DESTINATIONS = [
        "registry.npmjs.org",
        "github.com",
        "*.npmjs.org",
    ]
    
    @classmethod
    def validate_url(cls, url: str) -> bool:
        """Validate that a URL doesn't target internal resources"""
        import ipaddress
        from urllib.parse import urlparse
        
        try:
            parsed = urlparse(url)
            hostname = parsed.hostname
            
            if not hostname:
                return False
            
            # Check for localhost variants
            if hostname in ("localhost", "127.0.0.1", "::1", "0.0.0.0"):
                return False
            
            # Resolve and check IP ranges
            try:
                ip = ipaddress.ip_address(hostname)
                if ip.is_private or ip.is_loopback or ip.is_link_local:
                    return False
            except ValueError:
                # It's a hostname, not an IP - would need DNS resolution
                # In production, resolve DNS first then validate IP
                pass
            
            return True
        except Exception:
            return False
