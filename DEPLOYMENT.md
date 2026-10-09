# QUALNEX Deployment Guide

Complete guide for deploying QUALNEX to production.

---

## 📦 Push to GitHub

### Step 1: Initialize Git Repository

```bash
# If not already initialized
git init

# Add all files
git add .

# Create .gitignore if not exists
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
backend/venv/
__pycache__/
*.pyc

# Environment files (NEVER commit secrets)
.env
backend/.env
.env.local

# Build output
dist/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Docker
docker-compose.override.yml

# Logs
*.log
logs/
EOF

# Commit
git commit -m "Initial commit: QUALNEX production-ready system"

# Add remote
git remote add origin https://github.com/YOUR_USERNAME/qualnex.git

# Push
git branch -M main
git push -u origin main
```

### Step 2: GitHub Repository Settings

1. **Enable Issues** for bug tracking
2. **Enable Discussions** for community support
3. **Add Secrets** for CI/CD:
   - Go to Settings → Secrets and variables → Actions
   - Add: `DOCKER_USERNAME`, `DOCKER_PASSWORD`
   - Add: `DEPLOY_TOKEN` (for deployment)

---

## 🐳 Docker Deployment

### Local Docker Setup

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/qualnex.git
cd qualnex

# Quick start
chmod +x quickstart.sh
./quickstart.sh

# Or manual setup
cp .env.example .env
nano .env  # Configure environment
docker-compose up -d
```

### Production Docker Setup

**1. Create production docker-compose file:**

```bash
cp docker-compose.yml docker-compose.prod.yml
```

**2. Edit `docker-compose.prod.yml`:**

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        - VITE_API_URL=https://api.qualnex.io/api
        - VITE_WS_URL=wss://api.qualnex.io
    environment:
      - NODE_ENV=production
    restart: always
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '1'
          memory: 1G

  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      - ENVIRONMENT=production
      - DEBUG=false
    env_file:
      - .env.prod
    restart: always
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '2'
          memory: 2G
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  worker:
    build:
      context: ./backend
      dockerfile: Dockerfile
    command: python -m app.workers.main
    environment:
      - ENVIRONMENT=production
    env_file:
      - .env.prod
    restart: always
    deploy:
      replicas: 5
      resources:
        limits:
          cpus: '2'
          memory: 4G

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: qualnex
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    volumes:
      - postgres_/var/lib/postgresql/data
    secrets:
      - db_password
    restart: always
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass_FILE /run/secrets/redis_password
    volumes:
      - redis_/data
    secrets:
      - redis_password
    restart: always

secrets:
  db_password:
    file: ./secrets/db_password.txt
  redis_password:
    file: ./secrets/redis_password.txt
```

**3. Create production environment file:**

```bash
# Create .env.prod
cat > .env.prod << 'EOF'
DATABASE_URL=postgresql+asyncpg://qualnex:${DB_PASSWORD}@postgres:5432/qualnex
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379/0

# Use strong random values
JWT_SECRET_KEY=<generate-with-openssl-rand-hex-32>
ENCRYPTION_KEY=<generate-with-fernet>

# OAuth credentials
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
GITHUB_CLIENT_ID=<your-github-client-id>
GITHUB_CLIENT_SECRET=<your-github-client-secret>

# AI Provider
QWEN_API_KEY=<your-qwen-api-key>

# Production settings
DEBUG=false
ENVIRONMENT=production
CORS_ORIGINS=["https://app.qualnex.io"]
EOF

# Create secrets directory
mkdir -p secrets
echo "your-strong-db-password" > secrets/db_password.txt
echo "your-strong-redis-password" > secrets/redis_password.txt
chmod 600 secrets/*.txt
```

**4. Deploy:**

```bash
docker-compose -f docker-compose.prod.yml up -d
```

---

## ☁️ Cloud Deployment

### Option 1: Railway (Recommended for Quick Start)

**1. Install Railway CLI:**

```bash
npm i -g @railway/cli
railway login
```

**2. Deploy Backend:**

```bash
cd backend
railway init
railway add
# Select: PostgreSQL, Redis

railway up
```

**3. Deploy Frontend:**

```bash
cd ..
railway init
railway variables set VITE_API_URL=https://your-backend.up.railway.app/api
railway up
```

### Option 2: AWS ECS + RDS

**1. Create ECR Repository:**

```bash
aws ecr create-repository --repository-name qualnex-api
aws ecr get-login-password | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com
```

**2. Build and Push:**

```bash
docker build -t qualnex-api ./backend
docker tag qualnex-api:latest <account>.dkr.ecr.<region>.amazonaws.com/qualnex-api:latest
docker push <account>.dkr.ecr.<region>.amazonaws.com/qualnex-api:latest
```

**3. Create ECS Cluster:**

```bash
aws ecs create-cluster --cluster-name qualnex-cluster
```

**4. Create RDS Database:**

```bash
aws rds create-db-instance \
  --db-instance-identifier qualnex-db \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --master-username qualnex \
  --master-user-password <password> \
  --allocated-storage 20
```

**5. Deploy to ECS:**

Use AWS Console or ECS CLI to create task definition and service.

### Option 3: Google Cloud Run

**1. Build and Push to GCR:**

```bash
gcloud auth configure-docker
docker build -t gcr.io/YOUR_PROJECT/qualnex-api ./backend
docker push gcr.io/YOUR_PROJECT/qualnex-api
```

**2. Deploy:**

```bash
gcloud run deploy qualnex-api \
  --image gcr.io/YOUR_PROJECT/qualnex-api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars DATABASE_URL=<cloud-sql-connection>
```

### Option 4: Vercel (Frontend) + Railway (Backend)

**Frontend on Vercel:**

```bash
npm i -g vercel
vercel login
vercel --prod
```

**Backend on Railway:**

```bash
cd backend
railway init
railway up
```

---

## 🔒 Security Checklist

Before deploying to production:

- [ ] **Change all default passwords**
- [ ] **Generate strong JWT_SECRET_KEY** (32+ bytes)
- [ ] **Generate Fernet ENCRYPTION_KEY**
- [ ] **Enable HTTPS** (SSL/TLS certificates)
- [ ] **Set DEBUG=false**
- [ ] **Configure CORS** for production domain only
- [ ] **Use managed database** (not localhost)
- [ ] **Enable database backups**
- [ ] **Set up monitoring** (Sentry, DataDog, etc.)
- [ ] **Configure rate limiting**
- [ ] **Enable audit logging**
- [ ] **Review OAuth redirect URIs**
- [ ] **Test tenant isolation**
- [ ] **Verify SSRF protections**
- [ ] **Check container security** (non-root, read-only fs)
- [ ] **Set up alerting** for errors and downtime

---

## 📊 Monitoring Setup

### Sentry (Error Tracking)

```python
# backend/app/main.py
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

sentry_sdk.init(
    dsn="your-sentry-dsn",
    integrations=[FastApiIntegration()],
    traces_sample_rate=1.0,
    environment=settings.environment,
)
```

### Prometheus + Grafana

```bash
# Add to docker-compose.yml
prometheus:
  image: prom/prometheus
  volumes:
    - ./prometheus.yml:/etc/prometheus/prometheus.yml
  ports:
    - "9090:9090"

grafana:
  image: grafana/grafana
  ports:
    - "3001:3000"
  environment:
    - GF_SECURITY_ADMIN_PASSWORD=admin
```

---

## 🔄 CI/CD with GitHub Actions

**Create `.github/workflows/deploy.yml`:**

```yaml
name: Deploy QUALNEX

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.12'
      
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
          pip install pytest pytest-cov
      
      - name: Run tests
        run: |
          cd backend
          pytest --cov=app
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install frontend dependencies
        run: npm ci
      
      - name: Build frontend
        run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      
      - name: Build and push backend
        uses: docker/build-push-action@v4
        with:
          context: ./backend
          push: true
          tags: yourusername/qualnex-api:latest
      
      - name: Deploy to server
        run: |
          ssh user@your-server << 'EOF'
            cd /opt/qualnex
            docker-compose pull
            docker-compose up -d
          EOF
```

---

## 📝 Post-Deployment Verification

After deployment, verify:

```bash
# 1. Health check
curl https://api.qualnex.io/health

# 2. Database connection
curl https://api.qualnex.io/api/v1/health

# 3. Frontend loads
curl -I https://app.qualnex.io

# 4. OAuth works
# Try logging in with Google/GitHub

# 5. Can create project
# Use the UI to create a test project

# 6. Can start QA run
# Start a test QA run

# 7. Workers processing
# Check logs: docker-compose logs -f worker

# 8. No errors in logs
docker-compose logs --tail=100 | grep -i error
```

---

## 🆘 Production Support

### Backup Strategy

```bash
# Database backup
docker-compose exec postgres pg_dump -U qualnex qualnex > backup_$(date +%Y%m%d).sql

# Automate with cron
0 2 * * * /path/to/backup.sh
```

### Log Management

```bash
# Rotate logs
docker-compose logs --follow --tail=1000 > logs/app.log

# Use log aggregation service (Datadog, Logstash, etc.)
```

### Scaling

```bash
# Scale workers
docker-compose up -d --scale worker=10

# Scale API
docker-compose up -d --scale api=5
```

---

## 📞 Getting Help

- **Documentation:** `README.md`, `SETUP_GUIDE.md`
- **Issues:** GitHub Issues
- **Discussions:** GitHub Discussions
- **Email:** support@qualnex.io

---

**Ready to deploy?** Start with the Quick Start script:

```bash
./quickstart.sh
```
