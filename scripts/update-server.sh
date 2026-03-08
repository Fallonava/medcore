#!/bin/bash
# ============================================
# update-server.sh - Update MedCore Admin on EC2
# Jalankan: bash scripts/update-server.sh
# ============================================

set -e
echo "🚀 Memulai proses update MedCore Admin..."

# 1. Pull perubahan terbaru dari Git (jika ada Git)
if [ -d ".git" ]; then
    echo "📥 Menarik kode terbaru dari Git..."
    BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null || echo "main")
    git pull origin "$BRANCH"
else
    echo "⚠️ Folder .git tidak ditemukan. Pastikan file terbaru sudah ada di folder ini."
fi

# 2. Install dependencies (ci = reproducible, omit dev deps in production)
echo "📦 Menginstall dependencies..."
npm ci

# 3. Build aplikasi
echo "🏗️ Membangun (Build) aplikasi (standalone)..."
npm run build

# 4. Sinkronisasi aset statis ke folder standalone
# Next.js standalone butuh .next/static dan public di dalam folder standalone
echo "📂 Menyusun aset statis..."
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public

# 5. Database migration — uses DIRECT_URL to bypass connection pooler
echo "🗄️ Menjalankan migrasi database..."
# DIRECT_URL must be set in /etc/environment or .env.production.local on the server
DIRECT_URL="${DIRECT_URL:-$DATABASE_URL}" DATABASE_URL="${DIRECT_URL:-$DATABASE_URL}" npx prisma migrate deploy

# 6. Restart PM2 (Zero-downtime)
echo "🔄 Merestart aplikasi di PM2..."
# Reload will pick up new build without stopping the process
pm2 reload ecosystem.config.js --env production || pm2 start ecosystem.config.js --env production
pm2 save

echo ""
echo "✅ Update selesai!"
echo "📈 Cek status: pm2 status"
echo "📜 Cek logs: pm2 logs medcore-admin --lines 50"
