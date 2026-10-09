@echo off
REM QUALNEX Quick Start Script for Windows
REM Run this script to set up and start QUALNEX

echo.
echo ========================================
echo   QUALNEX Quick Start (Windows)
echo ========================================
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not installed!
    echo.
    echo Please install Docker Desktop for Windows:
    echo https://docs.docker.com/desktop/install/windows-install/
    echo.
    pause
    exit /b 1
)
echo [OK] Docker is installed

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running!
    echo.
    echo Please start Docker Desktop and try again.
    echo.
    pause
    exit /b 1
)
echo [OK] Docker is running

REM Check if compose.yaml exists
if not exist "compose.yaml" (
    echo [ERROR] compose.yaml not found!
    echo.
    echo Please make sure you're in the QUALNEX project directory.
    echo.
    pause
    exit /b 1
)
echo [OK] compose.yaml found

echo.
echo ========================================
echo   Setting up environment files...
echo ========================================
echo.

REM Create frontend .env if not exists
if not exist ".env" (
    echo Creating .env file...
    (
        echo # Frontend Environment Variables
        echo VITE_API_URL=http://localhost:8000/api
        echo VITE_WS_URL=ws://localhost:8000
        echo.
        echo # Firebase Authentication
        echo VITE_FIREBASE_API_KEY=your-firebase-api-key
        echo VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
        echo VITE_FIREBASE_PROJECT_ID=your-project-id
        echo VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
        echo VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
        echo VITE_FIREBASE_APP_ID=your-app-id
    ) > .env
    echo [OK] Created .env
    echo.
    echo [IMPORTANT] Please edit .env with your Firebase credentials!
    echo.
) else (
    echo [OK] .env already exists
)

REM Create backend .env if not exists
if not exist "backend\.env" (
    echo Creating backend\.env file...
    if not exist "backend" mkdir backend
    (
        echo # Backend Environment Variables
        echo.
        echo # Database
        echo DATABASE_URL=postgresql+asyncpg://qualnex:qualnex@postgres:5432/qualnex
        echo REDIS_URL=redis://redis:6379/0
        echo.
        echo # Firebase Authentication
        echo FIREBASE_API_KEY=
        echo FIREBASE_AUTH_DOMAIN=
        echo FIREBASE_PROJECT_ID=
        echo FIREBASE_SERVICE_ACCOUNT_KEY=
        echo.
        echo # AI - DeepSeek
        echo DEEPSEEK_API_KEY=your-deepseek-api-key
        echo DEEPSEEK_API_BASE=https://api.deepseek.com
        echo DEEPSEEK_MODEL=deepseek-chat
        echo DEEPSEEK_REASONER_MODEL=deepseek-reasoner
        echo.
        echo # Security
        echo JWT_SECRET_KEY=change-me-use-a-strong-random-string
        echo ENCRYPTION_KEY=change-me-generate-with-fernet
        echo.
        echo # Application
        echo DEBUG=false
        echo ENVIRONMENT=production
    ) > backend\.env
    echo [OK] Created backend\.env
    echo.
    echo [IMPORTANT] Please edit backend\.env with your credentials!
    echo.
) else (
    echo [OK] backend\.env already exists
)

echo.
echo ========================================
echo   Starting QUALNEX services...
echo ========================================
echo.

REM Start Docker Compose
docker compose up -d --build

if errorlevel 1 (
    echo.
    echo [ERROR] Failed to start services!
    echo.
    echo Check the error messages above for details.
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   QUALNEX is starting up!
echo ========================================
echo.
echo Services:
echo.
echo   Frontend:      http://localhost:3000
echo   Backend API:   http://localhost:8000
echo   API Docs:      http://localhost:8000/docs
echo   PostgreSQL:    localhost:5432
echo   Redis:         localhost:6379
echo   MinIO:         http://localhost:9001
echo.
echo Next Steps:
echo.
echo   1. Wait 30 seconds for services to initialize
echo   2. Edit .env with your Firebase credentials
echo   3. Edit backend\.env with your DeepSeek API key
echo   4. Restart services: docker compose restart
echo   5. Open http://localhost:3000 in your browser
echo   6. Sign in with Google or GitHub
echo.
echo Useful Commands:
echo.
echo   View logs:     docker compose logs -f
echo   Stop services: docker compose down
echo   Restart:       docker compose restart
echo   Rebuild:       docker compose up -d --build
echo.
echo Documentation:
echo.
echo   README.md              - Main documentation
echo   SETUP_GUIDE.md         - Detailed setup
echo   FIREBASE_SETUP.md      - Firebase auth setup
echo   DEEPSEEK_SETUP.md      - DeepSeek AI setup
echo   JIRA_SETUP.md          - Jira integration
echo   DEPLOYMENT.md          - Production deployment
echo.
pause
