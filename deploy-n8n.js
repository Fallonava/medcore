const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function deployN8N() {
  try {
    await ssh.connect({
      host: '192.168.1.12',
      username: 'fallonava',
      password: '@Fallonava35'
    });
    
    console.log('Connected to fallonava server.');
    
    // Use the latest fixed YAML content or just run the file already uploaded
    const command = 'sudo docker compose -f /home/fallonava/docker-compose.n8n.yaml up -d';
    const password = '@Fallonava35';
    
    console.log(`\n--- Running: ${command} ---`);
    const result = await ssh.execCommand(`echo "${password}" | sudo -S ${command}`);
    
    console.log('STDOUT:\n', result.stdout);
    if (result.stderr) {
      console.log('STDERR:\n', result.stderr);
    }
    
    // Check if container is running
    const check = await ssh.execCommand('sudo docker ps | grep n8n');
    console.log('\n--- Container Status ---');
    console.log(check.stdout || 'Container not found running.');

    ssh.dispose();
  } catch(err) {
    console.error('Deployment failed:', err);
    ssh.dispose();
  }
}

deployN8N();
