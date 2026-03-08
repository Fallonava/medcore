const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function getLogs() {
  try {
    await ssh.connect({
      host: '192.168.1.12',
      username: 'fallonava',
      password: '@Fallonava35',
    });
    
    // Check next server status
    const cmd = `
      export HOME=/home/fallonava
      export NVM_DIR="$HOME/.nvm"
      [ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh"
      pm2 logs medcore-admin --lines 30 --nostream
    `;
    const result = await ssh.execCommand(cmd, { cwd: '/home/fallonava' });
    console.log(result.stdout);
    if (result.stderr) console.error(result.stderr);
    
    ssh.dispose();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

getLogs();
