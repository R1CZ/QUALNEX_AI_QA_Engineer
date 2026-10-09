# QUALNEX — Autonomous AI Quality Engineering Platform

> **Your AI QA Engineer for the entire application.**

QUALNEX connects to your GitHub repository, builds your application in a secure isolated environment, discovers its structure, autonomously tests it, validates bugs with evidence, and delivers standardized QA cases to your issue tracker.

---

## 🚀 Quick Start

### 📁 Project Structure

```
QUALNEX_AI_QA_Engineer/
├── src/                    # Frontend (React + Vite + TypeScript)
├── backend/                # Backend (FastAPI + Python)
├── compose.yaml            # Docker Compose configuration
├── Dockerfile              # Frontend Docker build
├── nginx.conf              # Nginx config for frontend
├── package.json            # Frontend dependencies
├── .env.example            # Frontend env template
├── backend/.env.example    # Backend env template
└── README.md               # This file
```

### Option 1: Docker (Recommended)

**For Windows (PowerShell):**
```powershell
# Clone the repository
git clone https://github.com/YOUR_USERNAME/qualnex.git
cd QUALNEX_AI_QA_Engineer

# Run the quick start script
.\quickstart.bat
```

**For Linux/Mac:**
```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/qualnex.git
cd QUALNEX_AI_QA_Engineer

# Run the quick start script
chmod +x quickstart.sh
./quickstart.sh
```

The script will:
1. Check Docker installation
2. Create `.env` files from templates
3. Start all services

**Access the application:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Option 2: Manual Docker Setup

```bash
# Clone and configure
git clone https://github.com/YOUR_USERNAME/qualnex.git
cd QUALNEX_AI_QA_Engineer

# Create environment files
cp .env.example .env
cp backend/.env.example backend/.env

# Edit .env with your Firebase credentials and API keys
# Windows: notepad .env
# Linux/Mac: nano .env

# Start services
docker compose up -d
```

### Option 3: Local Development (Without Docker)

See [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed local development setup.

### 🪟 Windows-Specific Instructions

1. **Install Docker Desktop for Windows**
   - Download from: https://docs.docker.com/desktop/install/windows-install/
   - Enable WSL 2 backend (recommended)
   - Restart your computer after installation

2. **Start Docker Desktop**
   - Open Docker Desktop from Start Menu
   - Wait for it to show "Engine running"

3. **Run the project**
   ```powershell
   cd C:\Users\YOUR_USERNAME\QUALNEX_AI_QA_Engineer
   .\quickstart.bat
   ```

4. **Or manually start services**
   ```powershell
   docker compose up -d
   ```

5. **View logs**
   ```powershell
   docker compose logs -f
   ```

6. **Stop services**
   ```powershell
   docker compose down
   ```

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

### 🔗 Jira Integration Setup

QUALNEX automatically delivers validated bugs to your Jira projects as issues. Here's how to connect:

#### Option 1: Jira Cloud (Recommended)

**Step 1: Create API Token**
1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click **"Create API token"**
3. Name it `QUALNEX Integration`
4. Copy the token (you won't see it again)

**Step 2: Get Your Jira Cloud ID**
1. Go to https://admin.atlassian.com/
2. Select your organization
3. Click **"Settings"** → **"Domains"**
4. Your Cloud ID is in the URL: `https://admin.atlassian.com/g/<CLOUD_ID>/...`

**Step 3: Connect in QUALNEX**
1. Go to **Settings** → **Integrations** → **Jira**
2. Click **"Connect"**
3. Enter:
   - **Jira Domain**: `your-company.atlassian.net`
   - **Email**: Your Atlassian account email
   - **API Token**: The token from Step 1
   - **Project Key**: Your Jira project key (e.g., `PROJ`)
4. Click **"Test Connection"**
5. Click **"Save"**

#### Option 2: Jira Server / Data Center

**Step 1: Create Personal Access Token**
1. Go to your Jira instance
2. Click your profile icon → **"Manage Account"**
3. Go to **"Personal Access Tokens"**
4. Click **"Create token"**
5. Name it `QUALNEX Integration`
6. Set expiration (or leave unlimited)
7. Copy the token

**Step 2: Connect in QUALNEX**
1. Go to **Settings** → **Integrations** → **Jira**
2. Click **"Connect"**
3. Select **"Jira Server/Data Center"**
4. Enter:
   - **Jira URL**: `https://jira.your-company.com`
   - **Username**: Your Jira username
   - **API Token**: The token from Step 1
   - **Project Key**: Your Jira project key
5. Click **"Test Connection"**
6. Click **"Save"**

#### Required Jira Permissions

Your Jira user account needs:
- ✅ **Browse Projects** - To access the project
- ✅ **Create Issues** - To create bug reports
- ✅ **Add Comments** - To add details to issues
- ✅ **Edit Issues** - To update issue status
- ✅ **View Version Control** - To link commits (optional)

**Recommended**: Create a dedicated service account for QUALNEX with these permissions.

#### How It Works

```
QA Run Completes
  ↓
Validated Bugs Identified
  ↓
QA Cases Generated
  ↓
Integration Router
  ↓
Jira Adapter
  ↓
Creates Jira Issue with:
  - Title: [QUALNEX] Bug title
  - Description: Full bug report
  - Priority: Mapped from severity
  - Labels: qualnex, automated-qa
  - Attachments: Screenshots, logs
  ↓
Issue Created in Jira
  ↓
External Issue ID Saved
  ↓
No Duplicates (Idempotent)
```

#### Issue Format

QUALNEX creates Jira issues with:

```
Title: [QUALNEX] Form validation bypass on /checkout

Description:
h2. Description
The email field on the checkout page does not validate email format properly.

h2. Reproduction Steps
# Navigate to /checkout
# Enter "test@" in email field
# Click "Continue to Payment"
# Observe form submits without error

h2. Expected Result
Form should display validation error for invalid email format

h2. Actual Result
Form accepts "test@" as valid email and proceeds to payment

h2. Technical Context
- Route: /checkout
- Page: Checkout
- Category: Form Validation
- Confidence: High

_Generated by QUALNEX Autonomous QA Engine_

Priority: High (mapped from severity)
Labels: qualnex, automated-qa, bug
```

#### Testing the Connection

After connecting, test the integration:

1. Go to **Settings** → **Integrations** → **Jira**
2. Click **"Test Connection"**
3. You should see: ✅ **Connection successful**
4. If it fails, check:
   - API token is correct
   - Email/username is correct
   - Project key exists
   - User has required permissions

#### Troubleshooting

**"401 Unauthorized"**
- API token is incorrect or expired
- Regenerate the token

**"403 Forbidden"**
- User doesn't have permission to create issues
- Check project permissions

**"Project not found"**
- Project key is incorrect
- User doesn't have access to the project

**"Connection timeout"**
- Jira instance is unreachable
- Check firewall/network settings
- For Jira Server: verify URL is correct

#### Advanced Configuration

**Custom Field Mapping**

Edit `backend/app/integrations/jira.py` to customize field mapping:

```python
severity_to_priority = {
    "critical": "Highest",
    "high": "High",
    "medium": "Medium",
    "low": "Low",
}

# Add custom fields
custom_fields = {
    "customfield_10001": "QA Automated",  # Example custom field
}
```

**Webhook Integration**

QUALNEX can receive webhooks from Jira to sync issue status:

1. Go to **Settings** → **Integrations** → **Jira**
2. Copy the webhook URL
3. In Jira: **Project Settings** → **Webhooks** → **Create webhook**
4. Paste the URL
5. Select events: Issue updated, Issue deleted

#### Security

- ✅ API tokens encrypted at rest (Fernet encryption)
- ✅ Tokens never exposed to frontend
- ✅ All API calls use HTTPS
- ✅ Audit logging for all integration actions
- ✅ Rate limiting to prevent abuse

#### Rate Limits

Jira API rate limits:
- **Jira Cloud**: 100 requests per minute
- **Jira Server**: Configurable (typically 100-500/min)

QUALNEX automatically handles rate limiting with exponential backoff.

#### Support

- **Jira Cloud Docs**: https://developer.atlassian.com/cloud/jira/platform/
- **Jira Server Docs**: https://developer.atlassian.com/server/jira/platform/
- **API Reference**: https://developer.atlassian.com/cloud/jira/platform/rest/v3/

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
- **[JIRA_SETUP.md](JIRA_SETUP.md)** — Complete Jira integration setup guide
- **[FIREBASE_SETUP.md](FIREBASE_SETUP.md)** — Firebase authentication setup
- **[DEEPSEEK_SETUP.md](DEEPSEEK_SETUP.md)** — DeepSeek AI configuration
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
