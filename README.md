# MedCore Admin: Manual Lengkap

Satu-satunya panduan yang kamu butuhkan untuk menjalankan, mengetes, dan memperbarui aplikasi.

---

## 🚀 Cara Update Cepat (Produksi)
Tiap ada perubahan di lokal, lakukan 2 langkah ini:

1. **Push ke GitHub (Lokal):**
   ```bash
   git push origin master
   ```

2. **Jalankan Update di Server:**
   Masuk ke SSH server, lalu ketik:
   ```bash
   cd /home/ubuntu/admin-dashboard && bash scripts/update-server.sh
   ```

---

## 💻 Pengembangan Lokal (Local Dev)
Untuk menjalankan aplikasi di laptop kamu:
```bash
npm install
npm run dev
```
Buka: `http://localhost:3000`

---

## 🧪 Testing & Status
Perintah berguna untuk mengecek kesehatan kode:
- **Jalankan Test**: `npm test`
- **Cek Status Server**: `pm2 status`
- **Cek Log Server**: `pm2 logs medcore-admin`

---

## 🔑 Akses Server EC2
```bash
ssh -i "hospital-api.pem" ubuntu@16.79.196.134
```

---

## 🛠️ Troubleshooting Singkat
- **Gagal Build**: Hapus folder `.next` (`rm -rf .next`) lalu coba update lagi.
- **Database Error**: Pastikan koneksi DB di `.env` sudah benar.

---
*Dokumen ini menggantikan README.md, TESTING.md, dan PRODUCTION_READINESS.md lama agar lebih ringkas.*
