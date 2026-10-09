# QUALNEX Backend — FastAPI Production Server

## Architecture

```
User → Next.js Frontend → FastAPI API → PostgreSQL
                                    ↓
                              Redis Queue
                                    ↓
                          Background Workers
                                    ↓
                    Execution Orchestrator (Docker)
                    ├── Playwright Browser Workers
                    ├── API Testing Engine
                    └── Application Discovery
                                    ↓
                         AI Orchestrator (Qwen)
                                    ↓
                    Integration Router → Jira/GitHub/Linear
```

## Directory Structure

```
backend/
├── app/
│   ├── main.py                 # FastAPI application entry
│   ├── config.py               # Settings & environment
│   ├── dependencies.py         # Dependency injection
│   ├── api/
│   │   ├── v1/
│   │   │   ├── auth.py         # OAuth endpoints
│   │   │   ├── users.py        # User management
│   │   │   ├── organizations.py
│   │   │   ├── repositories.py # GitHub integration
│   │   │   ├── projects.py
│   │   │   ├── runs.py         # QA run management
│   │   │   ├── bugs.py
│   │   │   ├── qa_cases.py
│   │   │   ├── integrations.py
│   │   │   └── webhooks.py     # GitHub webhooks
│   │   └── router.py
│   ├── core/
│   │   ├── security.py         # Auth, JWT, OAuth
│   │   ├── auth.py             # Session management
│   │   ├── permissions.py      # RBAC
│   │   └── exceptions.py
│   ├── models/                 # SQLAlchemy models
│   │   ├── user.py
│   │   ├── organization.py
│   │   ├── project.py
│   │   ├── run.py
│   │   ├── bug.py
│   │   ├── qa_case.py
│   │   └── integration.py
│   ├── schemas/                # Pydantic schemas
│   ├── services/               # Business logic
│   │   ├── github_service.py
│   │   ├── run_service.py
│   │   ├── bug_service.py
│   │   └── integration_service.py
│   ├── workers/                # Background jobs
│   │   ├── executor.py
│   │   ├── browser_worker.py
│   │   ├── api_worker.py
│   │   └── discovery_worker.py
│   ├── agents/                 # AI agents
│   │   ├── orchestrator.py
│   │   ├── discovery_agent.py
│   │   ├── planning_agent.py
│   │   ├── browser_agent.py
│   │   ├── api_agent.py
│   │   ├── validation_agent.py
│   │   ├── dedup_agent.py
│   │   └── qacase_agent.py
│   ├── integrations/           # External adapters
│   │   ├── base.py
│   │   ├── jira.py
│   │   ├── github_issues.py
│   │   ├── linear.py
│   │   ├── azure_devops.py
│   │   └── servicenow.py
│   ├── sandbox/                # Docker execution
│   │   ├── orchestrator.py
│   │   ├── builder.py
│   │   └── preview.py
│   └── db/
│       ├── session.py
│       └── migrations/
├── tests/
├── alembic.ini
├── Dockerfile
├── requirements.txt
└── docker-compose.yml
```

## Deployment

```bash
# Development
docker-compose up

# Production
docker build -t qualnex-api .
docker run -p 8000:8000 qualnex-api
```

## Environment Variables

See `.env.example` for required configuration.
