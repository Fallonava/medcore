const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const path = require('path');

const ssh = new NodeSSH();

async function fix() {
  try {
    await ssh.connect({
      host: '192.168.1.12',
      username: 'fallonava',
      password: '@Fallonava35'
    });

    const remoteDir = '/home/fallonava/admin-dashboard';
    
    // 1. Repair .env with correct domain
    let envContent = fs.readFileSync('f:\\Next\\admin-dashboard\\.env.production.remote', 'utf8');
    envContent = envContent.replace(/NEXT_PUBLIC_APP_URL=.*/, 'NEXT_PUBLIC_APP_URL="https://medcore.fallonava.my.id"');
    
    console.log('Uploading repaired .env...');
    const tmpEnv = path.join(__dirname, '.env.tmp');
    fs.writeFileSync(tmpEnv, envContent);
    await ssh.putFile(tmpEnv, `${remoteDir}/.env`);
    fs.unlinkSync(tmpEnv);

    // 2. Repair ecosystem.config.js (ensure cwd is correct)
    let ecoContent = fs.readFileSync('f:\\Next\\admin-dashboard\\ecosystem.config.js', 'utf8');
    ecoContent = ecoContent.replace(/NEXT_PUBLIC_APP_URL: .*/, `NEXT_PUBLIC_APP_URL: 'https://medcore.fallonava.my.id',`);
    
    console.log('Uploading ecosystem.config.js...');
    const tmpEco = path.join(__dirname, 'ecosystem.config.js.tmp');
    fs.writeFileSync(tmpEco, ecoContent);
    await ssh.putFile(tmpEco, `${remoteDir}/ecosystem.config.js`);
    fs.unlinkSync(tmpEco);

    // 3. Restart PM2
    console.log('Restarting PM2...');
    const result = await ssh.execCommand('source ~/.nvm/nvm.sh && pm2 startOrReload ecosystem.config.js --update-env && pm2 save', { cwd: remoteDir });
    
    console.log('STDOUT:', result.stdout);
    console.log('STDERR:', result.stderr);

    console.log('✅ Fix applied.');
    ssh.dispose();
  } catch (err) {
    console.error(err);
    ssh.dispose();
  }
}

fix();
