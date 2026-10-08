# QUALNEX — Autonomous AI Quality Engineering Platform

> **Your AI QA Engineer for the entire application.**

QUALNEX connects to your GitHub repository, builds your application in a secure isolated environment, discovers its structure, autonomously tests it, validates bugs with evidence, and delivers standardized QA cases to your issue tracker.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                       │
│  React + TypeScript + Tailwind CSS + Framer Motion          │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS
┌──────────────────────────▼──────────────────────────────────┐
│                   API Gateway (FastAPI)                      │
│  OAuth 2.0 │ JWT Auth │ RBAC │ Rate Limiting │ Audit Logs   │
└──────┬───────────┬───────────────┬──────────────────────────┘
       │           │               │
┌──────▼───┐ ┌────▼─────┐ ┌──────▼──────────────────────────┐
│PostgreSQL│ │  Redis    │ │     Background Workers          │
│  (Data)  │ │ (Queue)  │ │  QA Executor │ Browser │ API    │
└──────────┘ └──────────┘ └──────┬──────────────────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │   Docker Sandbox Engine    │
                    │  Isolated │ Non-root │ SSRF│
                    │  Protected │ Ephemeral    │
                    └─────────────┬─────────────┘
                                  │
              ┌───────────────────▼───────────────────┐
              │         AI Orchestrator (Qwen)         │
              │  Discovery │ Planning │ Browser QA     │
              │  API QA │ Validation │ Dedup │ QACase  │
              └───────────────────┬───────────────────┘
                                  │
              ┌───────────────────▼───────────────────┐
              │        Integration Router              │
              │  Jira │ GitHub │ Linear │ Azure │ SN   │
              └───────────────────────────────────────┘
```

---

## 📁 Repository Structure

```
qualnex/
├── src/                          # Frontend (React + Vite)
│   ├── App.tsx                   # Main router
│   ├── components/
│   │   ├── Layout.tsx            # App shell with sidebar
│   │   └── QAConfigModal.tsx     # QA scope configuration
│   ├── context/
│   │   └── AppContext.tsx        # Global state management
│   ├── lib/
│   │   └── api.ts               # API client for backend
│   ├── pages/
│   │   ├── Landing.tsx           # Marketing homepage
│   │   ├── Login.tsx             # OAuth login
│   │   ├── Dashboard.tsx         # Main dashboard
│   │   ├── Projects.tsx          # Project management
│   │   ├── Repositories.tsx      # GitHub connection
│   │   ├── QARuns.tsx            # QA run list
│   │   ├── QARunDetail.tsx       # Run execution view
│   │   ├── AppMap.tsx            # Application discovery map
│   │   ├── Bugs.tsx              # Bug tracker
│   │   ├── QACases.tsx           # QA case delivery
│   │   ├── Reports.tsx           # Analytics
│   │   ├── Integrations.tsx      # External connections
│   │   ├── Architecture.tsx      # System architecture view
│   │   └── Settings.tsx          # User/org settings
│   └── types/
│       └── index.ts              # TypeScript definitions
│
├── backend/                      # Backend (FastAPI + Python)
│   ├── app/
│   │   ├── main.py              # FastAPI application
│   │   ├── config.py            # Environment configuration
│   │   ├── api/v1/routes.py     # All API endpoints
│   │   ├── core/security.py     # OAuth, JWT, auth
│   │   ├── models/models.py     # SQLAlchemy database models
│   │   ├── db/session.py        # Database connection
│   │   ├── agents/orchestrator.py  # AI agent system
│   │   ├── sandbox/orchestrator.py # Docker sandbox
│   │   ├── workers/executor.py  # Background job workers
│   │   └── integrations/adapters.py # Jira/GitHub/Linear
│   ├── Dockerfile
│   └── requirements.txt
│
├── docker-compose.yml           # Full stack orchestration
├── index.html                   # Frontend entry
└── README.md                    # This file
```

---

## 🚀 Quick Start

### Frontend Only (Current Build)

```bash
npm install
npm run dev     # Development server
npm run build   # Production build
```

### Full Stack (with Docker)

```bash
# 1. Configure environment
cp .env.example .env
# Edit .env with your OAuth credentials, AI keys, etc.

# 2. Start all services
docker-compose up -d

# 3. Access the application
# Frontend: http://localhost:3000
# API Docs: http://localhost:8000/api/docs
# MinIO Console: http://localhost:9001
```

---

## 🔑 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | For Google login |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | For Google login |
| `GITHUB_CLIENT_ID` | GitHub OAuth client ID | For GitHub login |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth secret | For GitHub login |
| `GITHUB_APP_ID` | GitHub App ID | For repo access |
| `GITHUB_APP_PRIVATE_KEY` | GitHub App private key | For repo access |
| `QWEN_API_KEY` | Qwen AI API key | For AI agents |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `REDIS_URL` | Redis connection string | Yes |
| `JWT_SECRET_KEY` | JWT signing secret | Yes |
| `ENCRYPTION_KEY` | Fernet encryption key | Yes |
| `S3_ENDPOINT` | Object storage endpoint | For artifacts |

---

## 🔐 Security Architecture

### Authentication
- **OAuth 2.0** with Google and GitHub
- **JWT tokens** with secure HttpOnly cookies
- **Session rotation** and expiration
- **CSRF protection** with state validation

### Authorization
- **RBAC**: Owner → Admin → Member → Viewer
- **Tenant isolation** enforced at every layer
- **Server-side validation** for all operations
- No frontend-only permission checks

### Container Security
- **Non-root execution** in all sandboxes
- **Dropped capabilities** (CAP_DROP ALL)
- **Read-only filesystem** with tmpfs overlays
- **Network restrictions** (no metadata, no private IPs)
- **Resource limits** (CPU, memory, PIDs, disk)
- **Execution timeouts** with automatic cleanup
- **No Docker socket** access from sandboxes

### AI Security
- **Prompt injection defense** with input sanitization
- **Strict separation**: System instructions ≠ Customer data
- **Tool permission controls** for AI-generated actions
- **No autonomous code modification** — read-only analysis

### SSRF Protection
- DNS resolution + IP validation before requests
- Blocked ranges: 169.254.x, 10.x, 172.16.x, 192.168.x
- No access to cloud metadata endpoints
- Network-level enforcement in sandbox containers

---

## 🤖 AI Agent Architecture

QUALNEX uses specialized AI agents orchestrated by a central coordinator:

| Agent | Purpose |
|-------|---------|
| **Discovery Agent** | Maps routes, components, APIs, workflows |
| **Planning Agent** | Creates test plans based on scope and app map |
| **Browser QA Agent** | Analyzes Playwright test results for defects |
| **API QA Agent** | Tests API endpoints for issues |
| **Validation Agent** | Reproduces and validates potential bugs |
| **Dedup Agent** | Identifies and merges duplicate findings |
| **QA Case Agent** | Generates standardized QA case documents |

**Provider**: Qwen (with abstraction layer for future model changes)

---

## 🔄 QA Run Pipeline

```
QUEUED → PREPARING → BUILDING → PREVIEW → DISCOVERING → 
PLANNING → TESTING → ANALYZING → VALIDATING → 
DEDUPLICATING → DELIVERING → COMPLETED
```

Each step is tracked in real-time via WebSocket/SSE with polling fallback.

---

## 🔌 Integration Adapters

| Vendor | Status | Method |
|--------|--------|--------|
| Jira | ✅ Designed | REST API (Cloud/Server) |
| GitHub Issues | ✅ Designed | GitHub REST API v3 |
| Linear | ✅ Designed | GraphQL API |
| Azure DevOps | 📋 Planned | REST API |
| ServiceNow | 📋 Planned | REST API |

All integrations support:
- Idempotent issue creation (no duplicates on retry)
- Encrypted credential storage
- Audit logging
- Automatic retry with backoff

---

## 📊 Database Schema

Key entities:
- `users` — Authentication & profiles
- `organizations` — Multi-tenant isolation
- `repositories` — GitHub connections
- `projects` — QA project configurations
- `qa_runs` — Execution tracking
- `findings` — Detected defects with evidence
- `qa_cases` — Standardized deliverables
- `integrations` — External system connections
- `audit_logs` — Security event trail
- `app_maps` — Discovered application structure

---

## 🧪 Testing Strategy

| Layer | Tools | Coverage |
|-------|-------|----------|
| Unit | pytest | Business logic, validators |
| Integration | pytest + testcontainers | DB, Redis, external APIs |
| API | httpx + pytest | Endpoint behavior, auth |
| E2E | Playwright | Full user flows |
| Security | Custom + OWASP ZAP | Auth, tenant isolation, SSRF |

---

## 📝 License

Proprietary — QUALNEX © 2026

---

## 🛣️ Roadmap

- [ ] Temporal.io for advanced workflow orchestration
- [ ] Multi-model AI support (GPT-4, Claude)
- [ ] Visual regression testing
- [ ] Performance benchmarking
- [ ] Custom test script upload
- [ ] Team collaboration features
- [ ] API key management for CI/CD
- [ ] On-premise deployment option
