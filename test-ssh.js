const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function testConnection() {
  try {
    await ssh.connect({
      host: '192.168.1.12',
      username: 'fallonava',
      password: '@Fallonava35',
    });
    console.log('--- CONNECTION SUCCESS ---');
    const result = await ssh.execCommand('uname -a && uptime');
    console.log('System Info:', result.stdout);
    ssh.dispose();
  } catch (err) {
    console.error('--- CONNECTION FAILED ---');
    console.error(err.message);
    process.exit(1);
  }
}

testConnection();
