#!/bin/bash
# ============================================
# sync-home.sh - Sync GitHub to Home Server
# ============================================

set -e

# Log file for automated runs
LOG_FILE="/home/fallonava/logs/sync-home.log"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏠 [$(date '+%Y-%m-%d %H:%M:%S')] Starting Home Server Sync..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. Pull latest code from GitHub
if [ -d ".git" ]; then
    echo "📥 Pulling latest code from GitHub (master)..."
    git fetch origin master
    git reset --hard origin/master
else
    echo "❌ .git folder not found. Please run git init and remote add first."
    exit 1
fi

# 2. Determine Deployment Mode (Docker or PM2)
if [ -f "docker-compose.yml" ] && command -v docker >/dev/null 2>&1; then
    echo "🏗️ Deployment Mode: Docker Compose"
    
    echo "📦 Rebuilding and restarting containers..."
    docker compose up -d --build
    
    echo "🗄️ Running database migrations in container..."
    docker compose exec -T medcore-app npx prisma migrate deploy
    
else
    echo "🏗️ Deployment Mode: Standard Node.js (PM2)"
    
    echo "📦 Installing dependencies (npm ci)..."
    npm ci
    
    echo "🏗️ Building application..."
    npm run build
    
    echo "📂 Syncing static assets..."
    cp -r .next/static .next/standalone/.next/static 2>/dev/null || true
    cp -r public .next/standalone/public 2>/dev/null || true
    
    echo "🗄️ Running database migrations..."
    npx prisma migrate deploy
    
    echo "🔄 Reloading PM2..."
    pm2 reload ecosystem.config.js --env production || pm2 start ecosystem.config.js --env production
    pm2 save
fi

echo ""
echo "✅ Sync complete! [$(date '+%Y-%m-%d %H:%M:%S')]"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
