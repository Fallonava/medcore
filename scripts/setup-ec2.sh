#!/bin/bash
# ============================================
# setup-ec2.sh - Setup server EC2 untuk MedCore Admin
# Jalankan: bash scripts/setup-ec2.sh
# OS: Ubuntu 22.04 LTS
# ============================================

set -e
echo "🚀 Starting MedCore Admin EC2 Setup..."

# ── 1. Update system ──────────────────────────────
echo "📦 Updating system packages..."
sudo apt-get update -y && sudo apt-get upgrade -y

# ── 2. Install Node.js 20 LTS ─────────────────────
echo "📦 Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# ── 3. Install PM2 ────────────────────────────────
echo "📦 Installing PM2..."
sudo npm install -g pm2

# ── 4. Install Nginx ──────────────────────────────
echo "📦 Installing Nginx..."
sudo apt-get install -y nginx

# ── 5. Setup app directory ────────────────────────
echo "📁 Setting up app directory..."
mkdir -p /home/ubuntu/admin-dashboard
mkdir -p /home/ubuntu/logs

# ── 6. Setup Nginx config ─────────────────────────
echo "⚙️ Configuring Nginx reverse proxy..."
sudo tee /etc/nginx/sites-available/medcore << 'EOF'
server {
    listen 80;
    server_name _;

    # SSE: disable buffering agar stream real-time
    proxy_buffering off;
    proxy_cache off;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;

        # SSE timeout - jangan putus koneksi SSE
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/medcore /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx
sudo systemctl enable nginx

# ── 7. PM2 startup ────────────────────────────────
echo "⚙️ Setting up PM2 startup on boot..."
pm2 startup systemd -u ubuntu --hp /home/ubuntu | tail -1 | sudo bash || true

echo ""
echo "✅ Server setup selesai!"
echo ""
echo "📋 Langkah selanjutnya:"
echo "  1. Upload project ke /home/ubuntu/admin-dashboard"
echo "     (git clone atau scp)"
echo "  2. Copy env: cp .env.production.example .env.production"
echo "  3. Edit env: nano .env.production"
echo "  4. Build: npm install && npm run build"
echo "  5. Copy static: cp -r .next/static .next/standalone/.next/static"
echo "                  cp -r public .next/standalone/public"
echo "  6. Start: pm2 start ecosystem.config.js && pm2 save"
echo "  7. Akses: http://16.79.196.134"
