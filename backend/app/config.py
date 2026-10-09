"""
QUALNEX Configuration Management
"""
from pydantic_settings import BaseSettings
from typing import List, Optional
import os

class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Application
    app_name: str = "QUALNEX"
    debug: bool = False
    environment: str = "development"
    
    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    
    # Database
    database_url: str = "postgresql+asyncpg://qualnex:qualnex@localhost:5432/qualnex"
    database_pool_size: int = 20
    database_max_overflow: int = 10
    
    # Redis
    redis_url: str = "redis://localhost:6379/0"
    redis_queue_name: str = "qualnex:jobs"
    
    # JWT / Session
    jwt_secret_key: str = "change-me-in-production-use-openssl-rand-hex-32"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7  # 7 days
    session_cookie_name: str = "qualnex_session"
    session_cookie_secure: bool = True
    session_cookie_httponly: bool = True
    session_cookie_samesite: str = "lax"
    
    # OAuth - Google
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:3000/auth/google/callback"
    
    # OAuth - GitHub
    github_client_id: str = ""
    github_client_secret: str = ""
    github_redirect_uri: str = "http://localhost:3000/auth/github/callback"
    
    # Firebase Authentication
    firebase_api_key: str = ""
    firebase_auth_domain: str = ""
    firebase_project_id: str = ""
    firebase_service_account_key: str = ""  # Path to service account JSON file
    
    # GitHub App
    github_app_id: str = ""
    github_app_private_key: str = ""
    github_app_webhook_secret: str = ""
    github_app_client_id: str = ""
    github_app_client_secret: str = ""
    
    # AI - Qwen
    qwen_api_key: str = ""
    qwen_api_base: str = "https://dashscope.aliyuncs.com/api/v1"
    qwen_model: str = "qwen-max"
    qwen_max_tokens: int = 4096
    qwen_temperature: float = 0.1
    
    # AI - Fallback
    fallback_model: str = "qwen-plus"
    ai_max_retries: int = 3
    ai_timeout_seconds: int = 120
    
    # Docker / Sandbox
    docker_socket: str = "unix:///var/run/docker.sock"
    sandbox_image: str = "qualnex/sandbox:latest"
    sandbox_network: str = "qualnex-sandbox"
    sandbox_cpu_limit: float = 2.0
    sandbox_memory_limit: str = "2g"
    sandbox_timeout: int = 600  # 10 minutes
    sandbox_max_concurrent: int = 10
    
    # Playwright
    playwright_image: str = "mcr.microsoft.com/playwright:v1.40.0-jammy"
    playwright_timeout: int = 30000
    playwright_screenshots: bool = True
    playwright_video: bool = True
    playwright_traces: bool = True
    
    # Object Storage (S3-compatible)
    s3_endpoint: str = ""
    s3_access_key: str = ""
    s3_secret_key: str = ""
    s3_bucket: str = "qualnex-artifacts"
    s3_region: str = "us-east-1"
    s3_presign_expiry: int = 3600
    
    # Integrations
    jira_cloud: bool = True
    linear_api_base: str = "https://api.linear.app/graphql"
    
    # Rate Limiting
    rate_limit_default: int = 100  # per minute
    rate_limit_auth: int = 10  # per minute
    rate_limit_qa_runs: int = 5  # per minute
    rate_limit_ai: int = 20  # per minute
    
    # CORS
    cors_origins: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "https://app.qualnex.io"
    ]
    
    # Encryption
    encryption_key: str = ""  # Fernet key for field-level encryption
    
    # Audit
    audit_log_retention_days: int = 90
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False

settings = Settings()
