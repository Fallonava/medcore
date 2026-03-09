const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function fix() {
  try {
    console.log('Connecting to 192.168.1.12...');
    await ssh.connect({
      host: '192.168.1.12',
      username: 'fallonava',
      password: '@Fallonava35'
    });
    console.log('✅ Connected.');

    const REMOTE_BASE = '/home/fallonava/admin-dashboard';

    console.log('\n[1/3] Running npm install in ' + REMOTE_BASE + '...');
    // We use bash to source nvm and run npm
    const installCmd = `
      export HOME=/home/fallonava
      export NVM_DIR="$HOME/.nvm"
      [ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh"
      cd ${REMOTE_BASE}
      npm install
    `;

    const installResult = await ssh.execCommand(installCmd, { 
      cwd: REMOTE_BASE,
      onStdout: (chunk) => process.stdout.write(chunk.toString('utf8')),
      onStderr: (chunk) => process.stderr.write(chunk.toString('utf8')),
    });

    if (installResult.code !== 0) {
      throw new Error(`npm install failed with code ${installResult.code}`);
    }
    console.log('✅ npm install completed.');

    console.log('\n[2/3] Restarting PM2 process...');
    const pm2Cmd = `
      export HOME=/home/fallonava
      export NVM_DIR="$HOME/.nvm"
      [ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh"
      pm2 delete medcore-admin 2>/dev/null || true
      cd ${REMOTE_BASE}
      pm2 start ecosystem.config.js
      pm2 save --force
    `;

    const pm2Result = await ssh.execCommand(pm2Cmd, { 
      cwd: REMOTE_BASE,
      onStdout: (chunk) => process.stdout.write(chunk.toString('utf8')),
      onStderr: (chunk) => process.stderr.write(chunk.toString('utf8')),
    });

    if (pm2Result.code !== 0) {
      throw new Error(`PM2 restart failed with code ${pm2Result.code}`);
    }
    console.log('✅ PM2 restarted.');

    console.log('\n[3/3] Verifying status...');
    const verifyCmd = `
      export HOME=/home/fallonava
      export NVM_DIR="$HOME/.nvm"
      [ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh"
      echo "--- PM2 Status ---"
      pm2 status medcore-admin
      echo "\n--- Port Check ---"
      netstat -tuln | grep :3000 || echo "Port 3000 NOT listening"
    `;

    const verifyResult = await ssh.execCommand(verifyCmd, { cwd: REMOTE_BASE });
    console.log(verifyResult.stdout);

    ssh.dispose();
    console.log('\n🚀 Fix execution finished!');
  } catch(err) {
    console.error('\n❌ ERROR:', err.message || err);
    ssh.dispose();
    process.exit(1);
  }
}

fix();
