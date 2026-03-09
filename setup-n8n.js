const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');
const path = require('path');

async function setupN8N() {
  try {
    await ssh.connect({
      host: '192.168.1.12',
      username: 'fallonava',
      password: '@Fallonava35'
    });
    
    console.log('Connected to fallonava server.');
    const password = '@Fallonava35';
    
    // 1. Ensure AppData/n8n exists
    console.log('Ensuring /DATA/AppData/n8n exists...');
    await ssh.execCommand(`echo "${password}" | sudo -S mkdir -p /DATA/AppData/n8n`);
    await ssh.execCommand(`echo "${password}" | sudo -S chown -R fallonava:fallonava /DATA/AppData/n8n`);

    // 2. Upload the compose file
    const localFile = path.join(__dirname, 'docker-compose.n8n.yaml');
    const remoteFile = '/home/fallonava/docker-compose.n8n.yaml';
    
    console.log(`Uploading ${localFile} to ${remoteFile}...`);
    await ssh.putFile(localFile, remoteFile);
    
    console.log('Successfully uploaded and prepared n8n config.');
    
    ssh.dispose();
  } catch(err) {
    console.error('Setup failed:', err);
    ssh.dispose();
  }
}

setupN8N();
