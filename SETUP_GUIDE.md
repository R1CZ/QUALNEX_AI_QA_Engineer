# QUALNEX Setup Guide

Complete guide for setting up QUALNEX locally and with Docker.

---

## 📋 Prerequisites

### For Local Development
- **Node.js** 18+ and npm
- **Python** 3.11+
- **PostgreSQL** 14+ (or use Docker)
- **Redis** 7+ (or use Docker)

### For Docker Deployment
- **Docker** 20.10+
- **Docker Compose** 2.0+

---

## 🚀 Quick Start (Docker - Recommended)

The easiest way to run QUALNEX is with Docker Compose.

### Step 1: Clone the Repository

```bash
git clone <your-repo-url>
cd qualnex
```

### Step 2: Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your configuration
nano .env  # or use your preferred editor
```

**Required Environment Variables:**

```bash
# Backend API Configuration
DATABASE_URL=postgresql+asyncpg://qualnex:qualnex@postgres:5432/qualnex
REDIS_URL=redis://redis:6379/0

# OAuth Credentials (Get from Google Cloud Console & GitHub Developer Settings)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Security
JWT_SECRET_KEY=generate-a-secure-random-string-here
ENCRYPTION_KEY=generate-a-fernet-key-here

# AI Provider (Qwen)
QWEN_API_KEY=your-qwen-api-key

# Frontend
VITE_API_URL=http://localhost:8000/api
VITE_WS_URL=ws://localhost:8000
```

### Step 3: Generate Security Keys

```bash
# Generate JWT secret
openssl rand -hex 32

# Generate Fernet encryption key
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

### Step 4: Start All Services

```bash
docker-compose up -d
```

This starts:
- ✅ Frontend (Next.js) on `http://localhost:3000`
- ✅ Backend API (FastAPI) on `http://localhost:8000`
- ✅ Background Workers
- ✅ PostgreSQL on `localhost:5432`
- ✅ Redis on `localhost:6379`
- ✅ MinIO (S3-compatible storage) on `http://localhost:9000`

### Step 5: Verify Installation

```bash
# Check all containers are running
docker-compose ps

# Check API health
curl http://localhost:8000/health

# View logs
docker-compose logs -f
```

### Step 6: Access the Application

Open your browser and navigate to:
- **Frontend:** http://localhost:3000
- **API Documentation:** http://localhost:8000/docs
- **MinIO Console:** http://localhost:9001 (username: qualnex, password: qualnex123)

---

## 🔧 Local Development Setup

For development with hot-reload and debugging.

### Step 1: Clone and Install Dependencies

```bash
git clone <your-repo-url>
cd qualnex

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Step 2: Setup Database

**Option A: Use Docker for Database Only**

```bash
# Start only PostgreSQL and Redis
docker-compose up -d postgres redis

# Database will be available at localhost:5432
# Redis will be available at localhost:6379
```

**Option B: Install PostgreSQL Locally**

```bash
# macOS
brew install postgresql
brew services start postgresql

# Ubuntu/Debian
sudo apt install postgresql
sudo systemctl start postgresql

# Create database
createdb qualnex
psql qualnex -c "CREATE USER qualnex WITH PASSWORD 'qualnex';"
psql qualnex -c "GRANT ALL PRIVILEGES ON DATABASE qualnex TO qualnex;"
```

### Step 3: Configure Environment

```bash
# Frontend
cp .env.example .env
# Edit .env with your values

# Backend
cd backend
cp .env.example .env
# Edit backend/.env with your values
```

**Backend .env example:**

```bash
DATABASE_URL=postgresql+asyncpg://qualnex:qualnex@localhost:5432/qualnex
REDIS_URL=redis://localhost:6379/0

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

JWT_SECRET_KEY=your-jwt-secret
ENCRYPTION_KEY=your-fernet-key
QWEN_API_KEY=your-qwen-api-key

DEBUG=true
ENVIRONMENT=development
```

### Step 4: Initialize Database

```bash
cd backend

# Run database migrations
alembic upgrade head

# Or create tables directly (development only)
python -c "from app.db.session import engine, Base; from app.models import *; Base.metadata.create_all(engine.sync_engine)"
```

### Step 5: Start Backend Server

```bash
cd backend
source venv/bin/activate

# Start API server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# In a separate terminal, start background workers
python -m app.workers.main
```

### Step 6: Start Frontend

```bash
# In the root directory
npm run dev
```

Frontend will be available at `http://localhost:5173`

### Step 7: Access the Application

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs

---

## 🔐 OAuth Setup

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Navigate to **APIs & Services > Credentials**
4. Click **Create Credentials > OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Add authorized redirect URIs:
   - `http://localhost:3000/auth/google/callback` (Docker)
   - `http://localhost:5173/auth/google/callback` (Local dev)
7. Copy **Client ID** and **Client Secret** to your `.env`

### GitHub OAuth

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Fill in:
   - Application name: QUALNEX
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/auth/github/callback`
4. Click **Register application**
5. Generate a new client secret
6. Copy **Client ID** and **Client Secret** to your `.env`

### GitHub App (for Repository Access)

1. Go to [GitHub Developer Settings > GitHub Apps](https://github.com/settings/apps)
2. Click **New GitHub App**
3. Configure:
   - Name: QUALNEX
   - Homepage URL: `http://localhost:3000`
   - Webhook URL: `http://your-domain.com/api/v1/webhooks/github`
   - Permissions:
     - Repository contents: Read-only
     - Metadata: Read-only
     - Pull requests: Read-only
4. Generate a private key
5. Copy **App ID**, **Client ID**, **Client Secret**, and private key to `.env`

---

## 🤖 AI Provider Setup (Qwen)

1. Sign up at [Alibaba Cloud DashScope](https://dashscope.console.aliyun.com/)
2. Navigate to **API Key Management**
3. Create a new API key
4. Copy the key to your `.env` as `QWEN_API_KEY`

---

## 🐳 Docker Commands

### Start Services

```bash
# Start all services in background
docker-compose up -d

# Start with build (if code changed)
docker-compose up -d --build

# Start specific service
docker-compose up -d api
```

### Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f worker
```

### Execute Commands

```bash
# Run database migrations
docker-compose exec api alembic upgrade head

# Access API shell
docker-compose exec api python

# Access database
docker-compose exec postgres psql -U qualnex
```

### Rebuild After Code Changes

```bash
# Rebuild and restart
docker-compose up -d --build

# Or rebuild specific service
docker-compose up -d --build api
```

---

## 📊 Database Management

### Using pgAdmin (GUI)

```bash
# Start pgAdmin
docker run -d --name pgadmin \
  -p 5050:80 \
  -e PGADMIN_DEFAULT_EMAIL=admin@qualnex.io \
  -e PGADMIN_DEFAULT_PASSWORD=admin \
  dpage/pgadmin4

# Access at http://localhost:5050
# Connection: host=postgres, port=5432, user=qualnex, password=qualnex
```

### Using psql (CLI)

```bash
# Docker
docker-compose exec postgres psql -U qualnex

# Local
psql -U qualnex -d qualnex
```

**Useful queries:**

```sql
-- List all tables
\dt

-- Count records
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM projects;
SELECT COUNT(*) FROM qa_runs;

-- View recent runs
SELECT id, status, created_at FROM qa_runs ORDER BY created_at DESC LIMIT 10;
```

---

## 🔍 Troubleshooting

### Backend Won't Start

```bash
# Check logs
docker-compose logs api

# Common issues:
# 1. Database not ready - wait 10 seconds and retry
# 2. Missing environment variables - check .env file
# 3. Port already in use - change port in docker-compose.yml
```

### Frontend Can't Connect to Backend

```bash
# Verify backend is running
curl http://localhost:8000/health

# Check CORS settings in backend/app/main.py
# Ensure your frontend URL is in allow_origins

# Check VITE_API_URL in frontend .env
```

### OAuth Login Fails

```bash
# Verify redirect URIs match exactly (including http vs https)
# Check client ID and secret are correct
# View backend logs for OAuth errors
docker-compose logs -f api | grep -i oauth
```

### Database Connection Issues

```bash
# Test database connection
docker-compose exec api python -c "from app.db.session import engine; print(engine)"

# Reset database (WARNING: deletes all data)
docker-compose down -v
docker-compose up -d postgres
docker-compose exec api alembic upgrade head
```

### Workers Not Processing Jobs

```bash
# Check Redis connection
docker-compose exec redis redis-cli ping

# Check worker logs
docker-compose logs -f worker

# Verify queue has jobs
docker-compose exec redis redis-cli LLEN qualnex:jobs
```

---

## 🚢 Production Deployment

### Environment Variables for Production

```bash
# Use strong random values
JWT_SECRET_KEY=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")

# Use managed services
DATABASE_URL=postgresql+asyncpg://user:pass@your-managed-db:5432/qualnex
REDIS_URL=redis://your-managed-redis:6379/0

# Production URLs
VITE_API_URL=https://api.qualnex.io/api
VITE_WS_URL=wss://api.qualnex.io

# Enable production mode
DEBUG=false
ENVIRONMENT=production
```

### Docker Production Build

```bash
# Build production images
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# Deploy
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Kubernetes Deployment

See `k8s/` directory for Kubernetes manifests (coming soon).

### Cloud Deployment

**Recommended stack:**
- **Frontend:** Vercel, Netlify, or Cloudflare Pages
- **Backend:** AWS ECS, Google Cloud Run, or Railway
- **Database:** AWS RDS, Supabase, or Neon
- **Redis:** Upstash, Redis Cloud, or AWS ElastiCache
- **Storage:** AWS S3, Cloudflare R2, or Backblaze B2

---

## 📝 Development Workflow

### Making Changes

1. **Frontend changes:**
   ```bash
   # Edit files in src/
   # Hot reload will update automatically
   ```

2. **Backend changes:**
   ```bash
   # Edit files in backend/app/
   # With --reload flag, server restarts automatically
   ```

3. **Database schema changes:**
   ```bash
   # Create migration
   cd backend
   alembic revision --autogenerate -m "description"
   
   # Apply migration
   alembic upgrade head
   ```

### Running Tests

```bash
# Frontend tests
npm test

# Backend tests
cd backend
pytest

# With coverage
pytest --cov=app
```

### Code Formatting

```bash
# Frontend
npm run lint
npm run format

# Backend
cd backend
black .
isort .
ruff check .
```

---

## 🆘 Getting Help

- **Documentation:** See `README.md` and `docs/` directory
- **Issues:** Report bugs on GitHub Issues
- **Discussions:** Use GitHub Discussions for questions

---

## ✅ Verification Checklist

After setup, verify:

- [ ] Frontend loads at http://localhost:3000 (or 5173)
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

**Need help?** Check the troubleshooting section or open an issue on GitHub.
