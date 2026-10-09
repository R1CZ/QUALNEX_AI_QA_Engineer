#!/bin/bash

# QUALNEX Quick Start Script
# This script helps you set up QUALNEX quickly

set -e

echo "🚀 QUALNEX Quick Start"
echo "======================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "   Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    echo "   Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker and Docker Compose detected"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo ""
    echo "⚠️  IMPORTANT: Edit .env file with your configuration:"
    echo "   - OAuth credentials (Google/GitHub)"
    echo "   - Qwen AI API key"
    echo "   - Security keys (JWT_SECRET_KEY, ENCRYPTION_KEY)"
    echo ""
    echo "   Run: nano .env  (or use your preferred editor)"
    echo ""
    read -p "Press Enter after you've configured .env..."
fi

# Generate security keys if not set
echo "🔐 Checking security keys..."
if grep -q "change-me" .env; then
    echo "   Generating JWT secret..."
    JWT_SECRET=$(openssl rand -hex 32)
    sed -i.bak "s/JWT_SECRET_KEY=change-me.*/JWT_SECRET_KEY=$JWT_SECRET/" .env
    
    echo "   Generating encryption key..."
    ENCRYPTION_KEY=$(python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())" 2>/dev/null || echo "generate-manually")
    if [ "$ENCRYPTION_KEY" != "generate-manually" ]; then
        sed -i.bak "s|ENCRYPTION_KEY=change-me.*|ENCRYPTION_KEY=$ENCRYPTION_KEY|" .env
    else
        echo "   ⚠️  Please generate ENCRYPTION_KEY manually:"
        echo "      python3 -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
    fi
    
    rm -f .env.bak
    echo "   ✅ Security keys generated"
fi

echo ""
echo "🐳 Starting QUALNEX with Docker Compose..."
echo ""

# Start services
docker-compose up -d

echo ""
echo "✅ QUALNEX is starting up!"
echo ""
echo "📊 Service Status:"
docker-compose ps
echo ""
echo "🌐 Access Points:"
echo "   Frontend:        http://localhost:3000"
echo "   Backend API:     http://localhost:8000"
echo "   API Docs:        http://localhost:8000/docs"
echo "   MinIO Console:   http://localhost:9001"
echo ""
echo "📝 Next Steps:"
echo "   1. Wait 30 seconds for all services to initialize"
echo "   2. Open http://localhost:3000 in your browser"
echo "   3. Sign in with Google or GitHub"
echo "   4. Connect a repository and start testing!"
echo ""
echo "📖 For detailed setup instructions, see SETUP_GUIDE.md"
echo ""
echo "🔍 View logs: docker-compose logs -f"
echo "🛑 Stop services: docker-compose down"
echo ""
