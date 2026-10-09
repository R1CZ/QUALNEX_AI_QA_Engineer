"""
Database Models - Complete Schema
"""
import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text, JSON,
    ForeignKey, Enum, Index, UniqueConstraint, CheckConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
import enum

from app.db.session import Base

# ============ Enums ============

class UserRole(str, enum.Enum):
    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"
    VIEWER = "viewer"

class ProjectStatus(str, enum.Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    ERROR = "error"

class RunStatus(str, enum.Enum):
    QUEUED = "queued"
    PREPARING = "preparing"
    BUILDING = "building"
    PREVIEW = "preview"
    DISCOVERING = "discovering"
    PLANNING = "planning"
    TESTING = "testing"
    ANALYZING = "analyzing"
    VALIDATING = "validating"
    DEDUPLICATING = "deduplicating"
    DELIVERING = "delivering"
    COMPLETED = "completed"
    BUILD_FAILED = "build_failed"
    PREVIEW_FAILED = "preview_failed"
    ENVIRONMENT_FAILED = "environment_failed"
    PARTIAL = "partial"
    CANCELLED = "cancelled"
    TIMED_OUT = "timed_out"

class BugStatus(str, enum.Enum):
    SUSPECTED = "suspected"
    INVESTIGATING = "investigating"
    CONFIRMED = "confirmed"
    DUPLICATE = "duplicate"
    NOT_REPRODUCIBLE = "not_reproducible"
    FALSE_POSITIVE = "false_positive"

class BugSeverity(str, enum.Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class BugConfidence(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class IntegrationVendor(str, enum.Enum):
    JIRA = "jira"
    GITHUB = "github"
    LINEAR = "linear"
    AZURE_DEVOPS = "azure_devops"
    SERVICENOW = "servicenow"

# ============ Models ============

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    avatar_url = Column(String(500))
    role = Column(Enum(UserRole), default=UserRole.MEMBER, nullable=False)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    
    # Firebase Authentication
    firebase_uid = Column(String(255), unique=True, index=True)
    
    # OAuth (legacy - kept for backwards compatibility)
    provider = Column(String(50))  # google, github, firebase
    provider_id = Column(String(255))
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login_at = Column(DateTime)
    
    # Soft delete
    deleted_at = Column(DateTime)
    
    # Relationships
    organization = relationship("Organization", back_populates="members")
    
    __table_args__ = (
        UniqueConstraint('provider', 'provider_id', name='uq_provider_id'),
        Index('idx_user_org', 'organization_id'),
    )

class Organization(Base):
    __tablename__ = "organizations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    plan = Column(String(50), default="free", nullable=False)  # free, pro, enterprise
    stripe_customer_id = Column(String(255))
    
    # Settings
    settings = Column(JSONB, default={})
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    members = relationship("User", back_populates="organization")
    projects = relationship("Project", back_populates="organization")
    repositories = relationship("Repository", back_populates="organization")
    integrations = relationship("Integration", back_populates="organization")

class Repository(Base):
    __tablename__ = "repositories"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    
    # GitHub info
    github_id = Column(Integer, unique=True)
    full_name = Column(String(255), nullable=False)  # owner/repo
    name = Column(String(255), nullable=False)
    owner = Column(String(255), nullable=False)
    language = Column(String(100))
    framework = Column(String(100))
    default_branch = Column(String(100), default="main")
    
    # Installation
    installation_id = Column(String(255))
    
    # Status
    connected = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_pushed_at = Column(DateTime)
    
    # Relationships
    organization = relationship("Organization", back_populates="repositories")
    projects = relationship("Project", back_populates="repository")
    
    __table_args__ = (
        Index('idx_repo_org', 'organization_id'),
    )

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    repository_id = Column(UUID(as_uuid=True), ForeignKey("repositories.id"), nullable=False)
    
    name = Column(String(255), nullable=False)
    status = Column(Enum(ProjectStatus), default=ProjectStatus.ACTIVE)
    
    # Build configuration
    branch = Column(String(100), default="main")
    build_command = Column(String(500), default="npm run build")
    start_command = Column(String(500), default="npm start")
    env_vars = Column(JSONB, default={})  # Encrypted at rest
    
    # QA defaults
    default_qa_config = Column(JSONB, default={})
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_run_at = Column(DateTime)
    
    # Relationships
    organization = relationship("Organization", back_populates="projects")
    repository = relationship("Repository", back_populates="projects")
    runs = relationship("QARun", back_populates="project")
    
    __table_args__ = (
        Index('idx_project_org', 'organization_id'),
    )

class QARun(Base):
    __tablename__ = "qa_runs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    
    status = Column(Enum(RunStatus), default=RunStatus.QUEUED, nullable=False)
    current_step = Column(String(100), default="Queued")
    progress = Column(Integer, default=0)
    
    # Configuration
    qa_config = Column(JSONB, nullable=False, default={})
    
    # Results
    test_count = Column(Integer, default=0)
    findings_count = Column(Integer, default=0)
    confirmed_bugs = Column(Integer, default=0)
    
    # Execution context
    container_id = Column(String(255))
    preview_url = Column(String(500))
    error_message = Column(Text)
    
    # Correlation
    correlation_id = Column(UUID(as_uuid=True), default=uuid.uuid4)
    
    # Timestamps
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    project = relationship("Project", back_populates="runs")
    findings = relationship("Finding", back_populates="run")
    events = relationship("RunEvent", back_populates="run")
    
    __table_args__ = (
        Index('idx_run_project', 'project_id'),
        Index('idx_run_org', 'organization_id'),
        Index('idx_run_status', 'status'),
    )

class RunEvent(Base):
    __tablename__ = "run_events"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id = Column(UUID(as_uuid=True), ForeignKey("qa_runs.id"), nullable=False)
    
    event_type = Column(String(50), nullable=False)
    step = Column(String(100))
    message = Column(Text)
    metadata = Column(JSONB, default={})
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    run = relationship("QARun", back_populates="events")

class Finding(Base):
    __tablename__ = "findings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id = Column(UUID(as_uuid=True), ForeignKey("qa_runs.id"), nullable=False)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    
    title = Column(String(500), nullable=False)
    description = Column(Text)
    
    status = Column(Enum(BugStatus), default=BugStatus.SUSPECTED)
    severity = Column(Enum(BugSeverity))
    confidence = Column(Enum(BugConfidence), default=BugConfidence.MEDIUM)
    category = Column(String(100))
    
    # Location
    page = Column(String(255))
    route = Column(String(500))
    component = Column(String(255))
    
    # Validation
    expected_result = Column(Text)
    actual_result = Column(Text)
    reproduction_steps = Column(JSONB, default=[])
    
    # Evidence
    evidence = Column(JSONB, default=[])  # List of evidence objects
    
    # Deduplication
    fingerprint = Column(String(255))
    is_duplicate = Column(Boolean, default=False)
    duplicate_of = Column(UUID(as_uuid=True), ForeignKey("findings.id"))
    
    # External delivery
    qa_case_id = Column(UUID(as_uuid=True), ForeignKey("qa_cases.id"))
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    validated_at = Column(DateTime)
    
    run = relationship("QARun", back_populates="findings")
    
    __table_args__ = (
        Index('idx_finding_run', 'run_id'),
        Index('idx_finding_org', 'organization_id'),
        Index('idx_finding_status', 'status'),
        Index('idx_finding_fingerprint', 'fingerprint'),
    )

class QACase(Base):
    __tablename__ = "qa_cases"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    
    case_number = Column(String(50), unique=True, nullable=False)  # QNX-000001
    finding_id = Column(UUID(as_uuid=True), ForeignKey("findings.id"))
    
    title = Column(String(500), nullable=False)
    severity = Column(Enum(BugSeverity))
    priority = Column(String(10))  # P0, P1, P2, P3
    category = Column(String(100))
    
    page = Column(String(255))
    route = Column(String(500))
    
    reproduction_steps = Column(JSONB, default=[])
    expected_result = Column(Text)
    actual_result = Column(Text)
    evidence = Column(JSONB, default=[])
    confidence = Column(Enum(BugConfidence))
    
    # Delivery
    delivered_to = Column(String(50))
    external_issue_id = Column(String(255))
    external_issue_url = Column(String(500))
    delivery_status = Column(String(50))  # pending, delivered, failed
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    delivered_at = Column(DateTime)
    
    __table_args__ = (
        Index('idx_qacase_org', 'organization_id'),
    )

class Integration(Base):
    __tablename__ = "integrations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    
    vendor = Column(Enum(IntegrationVendor), nullable=False)
    name = Column(String(255), nullable=False)
    connected = Column(Boolean, default=False)
    
    # Configuration (encrypted)
    config = Column(JSONB, default={})  # workspace, project, etc.
    credentials = Column(Text)  # Encrypted token/credentials
    
    # Status
    workspace = Column(String(255))
    project = Column(String(255))
    last_sync = Column(DateTime)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    organization = relationship("Organization", back_populates="integrations")
    
    __table_args__ = (
        Index('idx_integration_org', 'organization_id'),
        UniqueConstraint('organization_id', 'vendor', name='uq_org_vendor'),
    )

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    
    action = Column(String(100), nullable=False)
    resource_type = Column(String(100))
    resource_id = Column(String(255))
    
    result = Column(String(50))  # success, failure
    ip_address = Column(String(45))
    user_agent = Column(String(500))
    
    metadata = Column(JSONB, default={})
    correlation_id = Column(UUID(as_uuid=True))
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    __table_args__ = (
        Index('idx_audit_org', 'organization_id'),
        Index('idx_audit_action', 'action'),
    )

class AppMap(Base):
    __tablename__ = "app_maps"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    run_id = Column(UUID(as_uuid=True), ForeignKey("qa_runs.id"))
    
    nodes = Column(JSONB, nullable=False, default=[])
    edges = Column(JSONB, default=[])
    
    # Stats
    total_nodes = Column(Integer, default=0)
    pages_count = Column(Integer, default=0)
    components_count = Column(Integer, default=0)
    apis_count = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    __table_args__ = (
        Index('idx_appmap_project', 'project_id'),
    )
