@echo off
rem ============================================
rem deploy.bat - Satu klik untuk update server
rem ============================================

echo 📤 Memulai proses deployment...

echo 1. Push kode ke GitHub...
git push origin master

if %errorlevel% neq 0 (
    echo ❌ Gagal push ke GitHub. Deployment dibatalkan.
    pause
    exit /b %errorlevel%
)

echo 2. Menjalankan update di server EC2...
ssh -i "hospital-api.pem" ubuntu@16.79.196.134 "cd /home/ubuntu/admin-dashboard && bash scripts/update-server.sh"

if %errorlevel% neq 0 (
    echo ❌ Gagal menjalankan update di server.
    pause
    exit /b %errorlevel%
)

echo ✅ SEMUA BERHASIL! Aplikasi sudah terupdate.
pause
