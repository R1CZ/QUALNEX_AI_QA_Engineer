# QUALNEX — Autonomous AI Quality Engineering Platform

> **Your AI QA Engineer for the entire application.**

QUALNEX connects to your GitHub repository, builds your application in a secure isolated environment, discovers its structure, autonomously tests it, validates bugs with evidence, and delivers standardized QA cases to your issue tracker.

---

## 🚀 Quick Start

### Option 1: Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/qualnex.git
cd qualnex

# Run the quick start script
chmod +x quickstart.sh
./quickstart.sh
```

The script will:
1. Check Docker installation
2. Create `.env` file from template
3. Generate security keys
4. Start all services

**Access the application:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Option 2: Manual Docker Setup

```bash
# Clone and configure
git clone https://github.com/YOUR_USERNAME/qualnex.git
cd qualnex
cp .env.example .env

# Edit .env with your OAuth credentials and API keys
nano .env

# Start services
docker-compose up -d
```

### Option 3: Local Development

See [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed local development setup.

---

## 📋 Prerequisites

### For Docker Deployment
- Docker 20.10+
- Docker Compose 2.0+

### For Local Development
- Node.js 18+ and npm
- Python 3.11+
- PostgreSQL 14+
- Redis 7+

---

## 🔑 Required Configuration

Before running QUALNEX, you need to configure:

### 1. Firebase Authentication (FREE - Recommended)

QUALNEX uses **Firebase Authentication** which is **completely free** for up to 50,000 monthly active users.

**Quick Setup:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (free)
3. Enable Authentication → Google and GitHub providers
4. Add a web app and copy the config
5. See **[FIREBASE_SETUP.md](FIREBASE_SETUP.md)** for detailed instructions

**What you get for FREE:**
- ✅ 50,000 monthly active users
- ✅ Google Sign-In
- ✅ GitHub Sign-In
- ✅ Email/Password (optional)
- ✅ Phone Auth (limited)
- ✅ No credit card required

### 2. AI Provider (DeepSeek - Very Affordable)

QUALNEX uses **DeepSeek** for AI-powered features - extremely cost-effective:

**Quick Setup:**
1. Go to [DeepSeek Platform](https://platform.deepseek.com/)
2. Sign up (free - get 5M tokens)
3. Generate API key
4. Add to `backend/.env` as `DEEPSEEK_API_KEY`

**Cost:**
- ~$0.22 per 1M input tokens
- ~$0.28 per 1M output tokens
- **~$0.02 per QA run** (2 cents!)
- **5M free tokens** on signup

See **[DEEPSEEK_SETUP.md](DEEPSEEK_SETUP.md)** for detailed instructions and free alternatives (Ollama).

### 3. Security Keys

Generate strong random keys:

```bash
# JWT Secret
openssl rand -hex 32

# Encryption Key
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React + Vite)                  │
│  TypeScript + Tailwind CSS + Framer Motion                  │
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

## 📁 Project Structure

```
qualnex/
├── src/                          # Frontend (React + Vite)
│   ├── App.tsx                   # Main router
│   ├── components/               # Reusable components
│   ├── context/                  # React Context (state management)
│   ├── lib/                      # API client, utilities
│   ├── pages/                    # Page components
│   └── types/                    # TypeScript definitions
│
├── backend/                      # Backend (FastAPI + Python)
│   ├── app/
│   │   ├── main.py              # FastAPI application
│   │   ├── config.py            # Environment configuration
│   │   ├── api/v1/routes.py     # API endpoints
│   │   ├── core/security.py     # OAuth, JWT, auth
│   │   ├── models/models.py     # Database models
│   │   ├── agents/              # AI agents (Qwen)
│   │   ├── sandbox/             # Docker sandbox
│   │   ├── workers/             # Background workers
│   │   └── integrations/        # Jira, GitHub, Linear
│   ├── Dockerfile
│   └── requirements.txt
│
├── docker-compose.yml           # Full stack orchestration
├── SETUP_GUIDE.md               # Detailed setup instructions
├── DEPLOYMENT.md                # Production deployment guide
├── quickstart.sh                # Quick start script
└── README.md                    # This file
```

---

## 🎯 Features

### Core Capabilities

- ✅ **GitHub Integration** — Connect repositories via GitHub App
- ✅ **Secure Sandbox Execution** — Isolated Docker containers for building/testing
- ✅ **AI-Powered Discovery** — Automatically map application structure
- ✅ **Intelligent Test Planning** — AI generates test plans based on scope
- ✅ **Browser Testing** — Playwright-based automated testing
- ✅ **API Testing** — Endpoint validation and schema verification
- ✅ **Bug Validation** — AI validates and reproduces findings
- ✅ **Evidence Collection** — Screenshots, videos, logs, traces
- ✅ **Deduplication** — AI identifies and merges duplicate findings
- ✅ **QA Case Generation** — Standardized, platform-neutral bug reports
- ✅ **Integration Delivery** — Send to Jira, GitHub Issues, Linear, etc.

### Security Features

- 🔒 OAuth 2.0 authentication (Google/GitHub)
- 🔒 JWT-based session management
- 🔒 Role-based access control (RBAC)
- 🔒 Multi-tenant isolation
- 🔒 Docker container sandboxing
- 🔒 SSRF protection
- 🔒 AI prompt injection defense
- 🔒 Encrypted credential storage
- 🔒 Audit logging
- 🔒 Rate limiting

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

**AI Provider:** Qwen (with abstraction layer for future model support)

---

## 🔄 QA Run Pipeline

```
QUEUED → PREPARING → BUILDING → PREVIEW → DISCOVERING → 
PLANNING → TESTING → ANALYZING → VALIDATING → 
DEDUPLICATING → DELIVERING → COMPLETED
```

Each step is tracked in real-time via WebSocket/SSE.

---

## 🔌 Integrations

| Vendor | Status | Method |
|--------|--------|--------|
| Jira | ✅ Supported | REST API (Cloud/Server) |
| GitHub Issues | ✅ Supported | GitHub REST API v3 |
| Linear | ✅ Supported | GraphQL API |
| Azure DevOps | 📋 Planned | REST API |
| ServiceNow | 📋 Planned | REST API |

All integrations support:
- Idempotent issue creation (no duplicates on retry)
- Encrypted credential storage
- Audit logging
- Automatic retry with exponential backoff

---

## 📊 Technology Stack

### Frontend
- **React 18** + **TypeScript**
- **Vite** (build tool)
- **Tailwind CSS** (styling)
- **Framer Motion** (animations)
- **React Router** (routing)
- **Lucide React** (icons)

### Backend
- **Python 3.12** + **FastAPI**
- **SQLAlchemy** (ORM)
- **Pydantic** (validation)
- **asyncpg** (async PostgreSQL)
- **Redis** (job queue)
- **httpx** (async HTTP)

### Infrastructure
- **Docker** (containerization)
- **PostgreSQL 16** (database)
- **Redis 7** (queue/cache)
- **MinIO** (S3-compatible storage)
- **Playwright** (browser automation)

### AI
- **Qwen** (primary AI provider)
- Provider abstraction for future models

---

## 📖 Documentation

- **[SETUP_GUIDE.md](SETUP_GUIDE.md)** — Detailed setup instructions for local development and Docker
- **[DEPLOYMENT.md](DEPLOYMENT.md)** — Production deployment guide (Docker, cloud, CI/CD)
- **[backend/README.md](backend/README.md)** — Backend architecture and API documentation

---

## 🛠️ Development

### Run in Development Mode

```bash
# Frontend
npm install
npm run dev

# Backend (separate terminal)
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Build for Production

```bash
npm run build
```

### Run Tests

```bash
# Frontend
npm test

# Backend
cd backend
pytest
```

---

## 🚢 Deployment

### Quick Production Deploy

```bash
# Configure production environment
cp .env.example .env.prod
nano .env.prod

# Deploy with Docker Compose
docker-compose -f docker-compose.prod.yml up -d
```

### Cloud Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for:
- AWS ECS + RDS
- Google Cloud Run
- Railway
- Vercel + Railway combo
- Kubernetes

---

## 🔒 Security

QUALNEX implements comprehensive security measures:

### Authentication & Authorization
- OAuth 2.0 with Google and GitHub
- JWT tokens with secure HttpOnly cookies
- Role-based access control (Owner/Admin/Member/Viewer)
- Server-side validation for all operations

### Container Security
- Non-root execution in all sandboxes
- Dropped Linux capabilities
- Read-only filesystem with tmpfs overlays
- Network restrictions (no metadata, no private IPs)
- Resource limits (CPU, memory, PIDs, disk)
- Execution timeouts with automatic cleanup

### AI Security
- Prompt injection defense with input sanitization
- Strict separation: System instructions ≠ Customer data
- Tool permission controls for AI-generated actions
- No autonomous code modification — read-only analysis

### Data Protection
- Encrypted credential storage (Fernet)
- Tenant isolation at all layers
- Audit logging for all actions
- Secure artifact storage with signed URLs

---

## 🐛 Troubleshooting

### Common Issues

**Backend won't start:**
```bash
# Check logs
docker-compose logs api

# Verify database is ready
docker-compose exec postgres pg_isready
```

**Frontend can't connect:**
```bash
# Check VITE_API_URL in .env
# Verify backend is running
curl http://localhost:8000/health
```

**OAuth login fails:**
```bash
# Verify redirect URIs match exactly
# Check client ID and secret are correct
# View backend logs
docker-compose logs -f api | grep -i oauth
```

See [SETUP_GUIDE.md](SETUP_GUIDE.md#troubleshooting) for more troubleshooting tips.

---

## 📝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

Proprietary — QUALNEX © 2026

---

## 🆘 Support

- **Documentation:** See `SETUP_GUIDE.md` and `DEPLOYMENT.md`
- **Issues:** Report bugs on [GitHub Issues](https://github.com/YOUR_USERNAME/qualnex/issues)
- **Discussions:** Ask questions on [GitHub Discussions](https://github.com/YOUR_USERNAME/qualnex/discussions)

---

## ✅ Verification Checklist

After setup, verify:

- [ ] Frontend loads at http://localhost:3000
- [ ] Backend health check: `curl http://localhost:8000/health`
- [ ] Database connection works
- [ ] Redis connection works
- [ ] OAuth login works (Google or GitHub)
- [ ] Can create a project
- [ ] Can start a QA run
- [ ] Workers are processing jobs
- [ ] No errors in browser console
- [ ] No errors in backend logs

---

**Ready to start?** Run the quick start script:

```bash
./quickstart.sh
```

Or see [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed instructions.
