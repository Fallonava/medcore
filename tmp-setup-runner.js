const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function setupRunner() {
  try {
    console.log('Connecting to fallonava server...');
    await ssh.connect({
      host: '192.168.1.12',
      username: 'fallonava',
      password: '@Fallonava35',
    });
    console.log('Connected.');

    const token = 'BYZ3RG2DQ25LBVB35K5DCPDJV5D34';
    const repoUrl = 'https://github.com/Fallonava/admin-dashboard';
    const runnerVersion = '2.332.0';
    const arch = 'linux-x64';

    const commands = [
      `mkdir -p ~/actions-runner`,
      `cd ~/actions-runner && curl -o actions-runner-${arch}-${runnerVersion}.tar.gz -L https://github.com/actions/runner/releases/download/v${runnerVersion}/actions-runner-${arch}-${runnerVersion}.tar.gz`,
      `cd ~/actions-runner && tar xzf ./actions-runner-${arch}-${runnerVersion}.tar.gz`,
      `cd ~/actions-runner && ./config.sh --url ${repoUrl} --token ${token} --unattended --name fallonava-runner --replace`,
      `cd ~/actions-runner && echo "@Fallonava35" | sudo -S ./svc.sh install`,
      `cd ~/actions-runner && echo "@Fallonava35" | sudo -S ./svc.sh start`,
    ];

    for (const cmd of commands) {
      console.log(`\n--- Running: ${cmd} ---`);
      const result = await ssh.execCommand(cmd, {
        onStdout: (chunk) => process.stdout.write(chunk.toString()),
        onStderr: (chunk) => process.stderr.write(chunk.toString()),
      });
      if (result.code !== 0 && !cmd.includes('install')) {
         console.warn(`\nCommand failed with code ${result.code}`);
      }
    }

    console.log('\nFinal Status:');
    const status = await ssh.execCommand('cd ~/actions-runner && ./svc.sh status');
    console.log(status.stdout);

    ssh.dispose();
    console.log('\nRunner setup completed successfully!');
  } catch (err) {
    console.error('Setup failed:', err);
    ssh.dispose();
  }
}

setupRunner();
