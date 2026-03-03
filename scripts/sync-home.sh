#!/bin/bash
# ============================================
# sync-home.sh - Sync GitHub to Home Server (Docker)
# Jalankan: bash scripts/sync-home.sh
# ============================================

set -e
echo "🏠 Memulai proses sinkronisasi Home Server..."

# 1. Pull perubahan terbaru dari Git
if [ -d ".git" ]; then
    echo "📥 Menarik kode terbaru dari GitHub..."
    git pull origin master
else
    echo "❌ Folder .git tidak ditemukan. Pastikan sudah melakukan git init & remote."
    exit 1
fi

# 2. Update via Docker Compose (Build & Restart)
echo "🏗️ Membangun ulang (rebuild) container..."
docker compose up -d --build

echo ""
echo "✅ Sinkronisasi Home Server selesai!"
echo "📈 Cek status: docker ps"
echo "📜 Cek logs: docker compose logs -f medcore-app"
