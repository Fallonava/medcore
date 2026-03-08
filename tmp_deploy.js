const { NodeSSH } = require('node-ssh');
const path = require('path');
const fs = require('fs');

const ssh = new NodeSSH();

async function deploy() {
  try {
    await ssh.connect({
      host: '192.168.1.12',
      username: 'fallonava',
      password: '@Fallonava35'
    });
    console.log('✅ Connected to server.');

    const remoteBase = '/home/fallonava/admin-dashboard';
    const archiveName = 'admin-dashboard.tar.gz';
    const localArchivePath = path.join(process.cwd(), archiveName);
    const remoteArchivePath = `/tmp/${archiveName}`;

    console.log(`--- 1. Uploading archive: ${archiveName} ---`);
    await ssh.putFile(localArchivePath, remoteArchivePath);
    console.log('✅ Uploaded.');

    console.log('--- 2. Preparing remote directory ---');
    // We don't want to delete everything if it's not a git repo but we want a clean slate for files.
    // However, node_modules and .next should probably stay to speed up.
    // But since we excluded them from tarball, we will extract on top.
    await ssh.execCommand(`tar -xzf ${remoteArchivePath} -C ${remoteBase}`, { cwd: '/home/fallonava' });
    console.log('✅ Extracted.');

    console.log('--- 3. Installing dependencies and building ---');
    const deployCmd = `
      export HOME=/home/fallonava
      export NVM_DIR="$HOME/.nvm"
      [ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh"
      
      cd ${remoteBase}
      echo "Node version: $(node -v)"
      
      npm install
      npm run build
      
      # Prepare standalone static assets (Next.js standalone mode if used)
      cp -r .next/static .next/standalone/.next/static 2>/dev/null || true
      cp -r public .next/standalone/public 2>/dev/null || true
      
      # Reload app
      pm2 reload medcore-admin 2>/dev/null || pm2 start ecosystem.config.js
      pm2 save
    `;

    const result = await ssh.execCommand(deployCmd, {
      cwd: remoteBase,
      onStdout: (chunk) => process.stdout.write(chunk.toString()),
      onStderr: (chunk) => process.stderr.write(chunk.toString())
    });

    console.log(`\n--- Deployment finished with exit code ${result.code} ---`);
    if (result.code === 0) {
      console.log('🚀 DEPLOY BERHASIL!');
    } else {
      console.log('❌ DEPLOY GAGAL.');
    }

    // Cleanup
    await ssh.execCommand(`rm -f ${remoteArchivePath}`);
    ssh.dispose();
  } catch (err) {
    console.error('CRITICAL ERROR:', err);
    ssh.dispose();
    process.exit(1);
  }
}

deploy();
