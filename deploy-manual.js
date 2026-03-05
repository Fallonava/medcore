const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const path = require('path');

const ssh = new NodeSSH();

async function deploy() {
  try {
    console.log('--- 1. Connecting to home server (192.168.1.12) ---');
    await ssh.connect({
      host: '192.168.1.12',
      username: 'fallonava',
      password: '@Fallonava35'
    });
    console.log('✅ Connected.');

    const remoteBase = '/home/fallonava/admin-dashboard';
    const archiveName = 'admin-dashboard.tar.gz';
    const localArchivePath = path.join('f:', 'Next', 'admin-dashboard', archiveName);
    const remoteArchivePath = `/tmp/${archiveName}`;

    console.log(`--- 2. Uploading archive: ${archiveName} ---`);
    await ssh.putFile(localArchivePath, remoteArchivePath);
    console.log('✅ Uploaded.');

    console.log('--- 3. Cleaning & preparing remote directory ---');
    await ssh.execCommand(`rm -rf ${remoteBase} && mkdir -p ${remoteBase}`, { cwd: '/home/fallonava' });
    
    console.log('--- 4. Extracting archive ---');
    await ssh.execCommand(`tar -xzf ${remoteArchivePath} -C ${remoteBase}`, { cwd: '/home/fallonava' });
    console.log('✅ Extracted (fresh clean deploy).');

    console.log('--- 5. Preparing environment variables ---');
    const envContent = fs.readFileSync('f:\\Next\\admin-dashboard\\.env.production.remote', 'utf8');
    await ssh.execCommand(`cat << 'EOF' > ${remoteBase}/.env\n${envContent}\nEOF`, { cwd: remoteBase });
    console.log('✅ .env prepared.');

    console.log('--- 6. Installing dependencies and building ---');
    const deployCmd = `
      export HOME=/home/fallonava
      export NVM_DIR="$HOME/.nvm"
      [ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh"
      
      echo "Node version: $(node -v)"
      
      # Ensure PM2 is installed
      if ! command -v pm2 &> /dev/null; then
        echo "PM2 not found. Installing globally..."
        npm install -g pm2
      fi
      
      PM2_BIN=$(which pm2)
      echo "Using PM2 at: $PM2_BIN"

      npm install
      npm run build
      
      # Prepare standalone static assets
      cp -r .next/static .next/standalone/.next/static 2>/dev/null || true
      cp -r public .next/standalone/public 2>/dev/null || true
      
      # Setup/Reload PM2 using absolute path
      $PM2_BIN reload medcore-admin 2>/dev/null || $PM2_BIN start ecosystem.config.js
      $PM2_BIN save
    `;

    const result = await ssh.execCommand(deployCmd, {
      cwd: remoteBase,
      onStdout: (chunk) => process.stdout.write(chunk.toString('utf8')),
      onStderr: (chunk) => process.stderr.write(chunk.toString('utf8'))
    });

    console.log(`\n--- Deployment finished with exit code ${result.code} ---`);
    if (result.code === 0) {
      console.log('🚀 PROSES DEPLOY BERHASIL!');
      console.log('Aplikasi berjalan di http://192.168.1.12:3000');
    } else {
      console.log('❌ DEPLOY GAGAL. Periksa log di atas.');
    }

    // Cleanup temporary archive on remote
    await ssh.execCommand(`rm -f ${remoteArchivePath}`, { cwd: '/home/fallonava' });

    ssh.dispose();
  } catch (err) {
    console.error('CRITICAL ERROR:', err);
    ssh.dispose();
    process.exit(1);
  }
}

deploy();
