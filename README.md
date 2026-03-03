# MedCore Admin: Manual Lengkap

Satu-satunya panduan yang kamu butuhkan untuk menjalankan, mengetes, dan memperbarui aplikasi.

---

## 🚀 Cara Update Tercepat (Sekali Klik)

Saya sudah membuatkan script **Satu Klik** agar kamu tidak perlu masuk ke SSH secara manual.

### Di Laptop (Lokal)

Cukup klik dua kali (atau jalankan) file:
👉 **`deploy.bat`**

Script ini akan otomatis:

1. Melakukan `git push` ke GitHub.
2. Login otomatis ke server.
3. Menjalankan proses update di server sampai selesai.

---

## 🛠️ Update Manual (Jika Perlu)

Jika kamu ingin melakukannya step-by-step:

1. **Push ke GitHub (Lokal)**

   ```bash
   git push origin master
   ```

2. **Jalankan Update di Server**

   Masuk ke SSH server (`ssh -i "hospital-api.pem" ubuntu@16.79.196.134`), lalu ketik:

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

## 🏠 Backup ke Home Server (CasaOS + GitHub Sync)

Ikuti langkah ini agar home server kamu bisa otomatis tarik kode dari GitHub:

### Langkah 1: Setup SSH di Home Server (Hanya Sekali)

1. Masuk ke SSH home server kamu.
2. Buat kunci SSH: `ssh-keygen -t ed25519 -C "home-server-medcore"`.
3. Tampilkan public key: `cat ~/.ssh/id_ed25519.pub`.
4. **Copy & Paste** hasilnya ke akun GitHub kamu (Settings -> SSH Keys).

### Langkah 2: Hubungkan Project ke GitHub

Di terminal home server, masuk ke folder project dan jalankan:

```bash
git init
git remote add origin git@github.com:Fallonava/admin-dashboard.git
git fetch origin
git checkout -f master
```

### Langkah 3: Cara Update/Sinkronisasi

Tiap kali ada perubahan di GitHub, kamu cukup jalankan satu perintah di home server:

```bash
bash scripts/sync-home.sh
```

*Script ini akan otomatis melakukan git pull dan membangun ulang (rebuild) container Docker kamu.*

---

*Dokumen ini menggantikan README.md lama agar lebih ringkas dan praktis.*
