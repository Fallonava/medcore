const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function check() {
  try {
    await ssh.connect({
      host: '192.168.1.12',
      username: 'fallonava',
      password: '@Fallonava35'
    });
    console.log('✅ Connected.');

    console.log('--- Checking PM2 location ---');
    const result = await ssh.execCommand('which pm2 || find /home/fallonava -name pm2 -type f 2>/dev/null', {
      cwd: '/home/fallonava'
    });
    console.log(result.stdout || 'PM2 not found');

    console.log('--- Checking NVM/Node ---');
    const nvmResult = await ssh.execCommand('source ~/.nvm/nvm.sh && which node && which npm && which pm2', {
      cwd: '/home/fallonava',
      shell: '/bin/bash'
    });
    console.log(nvmResult.stdout);

    ssh.dispose();
  } catch(err) {
    console.error(err);
    ssh.dispose();
  }
}
check();
