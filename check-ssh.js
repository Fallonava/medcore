const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function check() {
  try {
    await ssh.connect({
      host: '192.168.1.12',
      username: 'fallonava',
      password: '@Fallonava35'
    });
    
    const commands = [
      'ls -la /home/fallonava',
      'find /home/fallonava -name ".git" -type d -maxdepth 3'
    ];

    const results = [];
    for (const cmd of commands) {
      console.log(`\n--- Running: ${cmd} ---`);
      const result = await ssh.execCommand(cmd, { cwd: '/home/fallonava' });
      console.log('STDOUT:', result.stdout);
      console.log('STDERR:', result.stderr);
      console.log('EXIT CODE:', result.code);
    }

    ssh.dispose();
  } catch(err) {
    console.error(err);
    ssh.dispose();
  }
}
check();
