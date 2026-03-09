const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkCasaOSDisk() {
  try {
    await ssh.connect({
      host: '192.168.1.12',
      username: 'fallonava',
      password: '@Fallonava35'
    });
    
    console.log('Connected to fallonava server.');
    
    const commands = [
      'ls -la /DATA',               // Check if these are symlinks
      'find /DATA -maxdepth 1 -type l' // Find symlinks in /DATA
    ];

    for (const cmd of commands) {
      console.log(`\n--- Running: ${cmd} ---`);
      const result = await ssh.execCommand(cmd);
      console.log('STDOUT:\n', result.stdout);
      if (result.stderr) console.log('STDERR:\n', result.stderr);
    }
    
    ssh.dispose();
  } catch(err) {
    console.error('Error:', err);
    ssh.dispose();
  }
}

checkCasaOSDisk();
