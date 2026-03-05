const { NodeSSH } = require('node-ssh');
const fs = require('fs');

const ssh = new NodeSSH();

async function deploy() {
  try {
    console.log('Connecting to home server at 192.168.1.12...');
    await ssh.connect({
      host: '192.168.1.12',
      username: 'fallonava',
      password: '@Fallonava35'
    });
    console.log('✅ Connected successfully.');

    const localScript = 'c:\\Windows\\Temp\\deploy-home.sh';
    const remoteScript = '/tmp/deploy-home.sh';
    console.log('Uploading deployment script...');
    await ssh.putFile(localScript, remoteScript);
    console.log('✅ Uploaded successfully to ' + remoteScript);

    console.log('Executing deployment script on home server...');
    const result = await ssh.execCommand('chmod +x /tmp/deploy-home.sh && bash /tmp/deploy-home.sh', {
      cwd: '/home/fallonava',
      onStdout: (chunk) => process.stdout.write(chunk.toString('utf8')),
      onStderr: (chunk) => process.stderr.write(chunk.toString('utf8'))
    });

    console.log('\nDeployment finished with code ' + result.code);
    ssh.dispose();
  } catch(err) {
    console.error('Error during deployment:', err);
    ssh.dispose();
    process.exit(1);
  }
}

deploy();
