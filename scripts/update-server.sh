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
    git pull origin master
else
    echo "⚠️ Folder .git tidak ditemukan. Pastikan file terbaru sudah ada di folder ini."
fi

# 2. Install dependencies (hanya jika package.json berubah)
echo "📦 Menginstall dependencies..."
npm install

# 3. Build aplikasi
echo "🏗️ Membangun (Build) aplikasi (standalone)..."
npm run build

# 4. Sinkronisasi aset statis ke folder standalone
# Next.js standalone butuh .next/static dan public di dalam folder standalone
echo "📂 Menyusun aset statis..."
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public

# 5. Database migration (Opsional - aktifkan jika pakai Prisma Migrations)
# echo "🗄️ Menjalankan migrasi database..."
# npx prisma migrate deploy

# 6. Restart PM2 (Zero-downtime)
echo "🔄 Merestart aplikasi di PM2..."
pm2 reload medcore-admin || pm2 start ecosystem.config.js
pm2 save

echo ""
echo "✅ Update selesai!"
echo "📈 Cek status: pm2 status"
echo "📜 Cek logs: pm2 logs medcore-admin --lines 50"
