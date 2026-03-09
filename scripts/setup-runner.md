# Setup Guide: GitHub Self-Hosted Runner (Home Server)

To enable automatic sync without exposing ports, follow these steps on your **Home Server**:

## 1. Create Runner on GitHub

1. Go to your repository on GitHub: **Settings -> Actions -> Runners**.
2. Click **New self-hosted runner**.
3. Select **Linux** and **X64** (or your server's architecture).

## 2. Download & Configure (On Home Server)

Copy and run the commands provided by GitHub. They look like this (example):

```bash
# Create a folder
mkdir actions-runner && cd actions-runner

# Download the latest runner package
curl -o actions-runner-linux-x64-2.321.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.321.0/actions-runner-linux-x64-2.321.0.tar.gz

# Extract the installer
tar xzf ./actions-runner-linux-x64-2.321.0.tar.gz

# Create the runner and start the configuration experience
./config.sh --url https://github.com/Fallonava/admin-dashboard --token YOUR_TOKEN_HERE

# Last step, run it!
./run.sh
```

## 3. Run as a Service (Very Important)

To make sure the runner stays active after you close the SSH session:

```bash
sudo ./svc.sh install
sudo ./svc.sh start
```

---

## 5. 🛡️ Security Hardening (Sangat Penting!)

Karena repository Anda bersifat **publik**, ada risiko keamanan jika orang lain membuat *Pull Request* (PR) yang berisi kode berbahaya.

**Wajib dilakukan di GitHub Settings:**
1. Masuk ke **Settings -> Actions -> General**.
2. Cari bagian **Workflow permissions**.
3. Cari **Fork pull request workflows from outside collaborators**.
4. Pilih **Require approval for all outside collaborators** (agar runner tidak langsung jalan sebelum Anda setujui).

**Rekomendasi Tambahan:**
- Gunakan runner hanya untuk branch spesifik (misal: `master`).
- Jangan simpan *secrets* yang sangat sensitif kecuali benar-benar diperlukan oleh runner.
