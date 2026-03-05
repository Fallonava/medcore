const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function reset() {
  try {
    await ssh.connect({
      host: '192.168.1.12',
      username: 'fallonava',
      password: '@Fallonava35'
    });
    console.log('✅ Connected.');

    const adminKey = 'dev_key_123';
    const payload = JSON.stringify({
      username: 'admin',
      password: 'dev_key_123',
      name: 'Administrator',
      adminKey: adminKey
    });

    // We use a temp file on the server to avoid shell escaping hell
    await ssh.execCommand(`echo '${payload}' > /tmp/admin_payload.json`, { cwd: '/home/fallonava' });
    
    console.log('--- 1. Resetting Admin via local API ---');
    const res = await ssh.execCommand('curl -X POST http://localhost:3000/api/auth/create-superadmin -H "Content-Type: application/json" -d @/tmp/admin_payload.json');
    
    console.log('Response:', res.stdout);
    if (res.stderr) console.error('Error:', res.stderr);

    await ssh.execCommand('rm /tmp/admin_payload.json');
    ssh.dispose();
  } catch(err) {
    console.error(err);
    ssh.dispose();
  }
}
reset();
