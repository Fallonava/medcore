const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function fix() {
  try {
    await ssh.connect({
      host: '192.168.1.12',
      username: 'fallonava',
      password: '@Fallonava35'
    });
    console.log('✅ Connected.');

    const remoteBase = '/home/fallonava/admin-dashboard';

    console.log('--- 1. Creating logs directory ---');
    await ssh.execCommand('mkdir -p /home/fallonava/logs', { cwd: '/home/fallonava' });
    console.log('✅ Logs dir created.');

    console.log('--- 2. Uploading fixed ecosystem.config.js ---');
    await ssh.putFile('f:\\Next\\admin-dashboard\\ecosystem.config.js', `${remoteBase}/ecosystem.config.js`);
    console.log('✅ ecosystem.config.js uploaded.');

    console.log('--- 3. Starting PM2 ---');
    const deployCmd = `
      export HOME=/home/fallonava
      export NVM_DIR="$HOME/.nvm"
      [ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh"
      
      PM2_BIN=$(which pm2)
      cd ${remoteBase}
      $PM2_BIN delete medcore-admin 2>/dev/null || true
      $PM2_BIN start ecosystem.config.js
      $PM2_BIN save
    `;

    const result = await ssh.execCommand(deployCmd, {
      cwd: remoteBase,
      onStdout: (chunk) => process.stdout.write(chunk.toString('utf8')),
      onStderr: (chunk) => process.stderr.write(chunk.toString('utf8'))
    });

    console.log(`\n--- PM2 action finished with code ${result.code} ---`);
    if (result.code === 0) {
      console.log('🚀 PROSES DEPLOY BERHASIL!');
      console.log('Aplikasi berjalan di http://192.168.1.12:3000');
    } else {
      console.log('❌ GAGAL START PM2.');
    }

    ssh.dispose();
  } catch(err) {
    console.error(err);
    ssh.dispose();
  }
}
fix();
