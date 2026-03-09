const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function migrate() {
  try {
    await ssh.connect({
      host: '192.168.1.12',
      username: 'fallonava',
      password: '@Fallonava35'
    });
    
    console.log('Connected to fallonava server.');
    
    const password = '@Fallonava35';
    const folders = ['Documents', 'Downloads', 'Gallery', 'Media'];
    const targetBase = '/mnt/cloud-storage/DATA';
    
    // 1. Create target base directory
    console.log(`Creating target directory: ${targetBase}`);
    await ssh.execCommand(`echo "${password}" | sudo -S mkdir -p ${targetBase}`);
    await ssh.execCommand(`echo "${password}" | sudo -S chown fallonava:fallonava ${targetBase}`);

    for (const folder of folders) {
      const source = `/DATA/${folder}`;
      const target = `${targetBase}/${folder}`;
      
      console.log(`\n--- Processing: ${folder} ---`);
      
      // Check if source exists and is NOT a symlink
      const checkSource = await ssh.execCommand(`ls -ld ${source}`);
      if (checkSource.stdout.startsWith('l')) {
        console.log(`Skipping ${folder}: Already a symbolic link.`);
        continue;
      }
      if (checkSource.code !== 0) {
        console.log(`Skipping ${folder}: Does not exist.`);
        continue;
      }

      // 2. Move data
      console.log(`Moving ${source} to ${target}...`);
      const moveResult = await ssh.execCommand(`echo "${password}" | sudo -S mv ${source} ${target}`);
      if (moveResult.code !== 0) {
        console.error(`Error moving ${folder}:`, moveResult.stderr);
        continue;
      }

      // 3. Create Symlink
      console.log(`Creating symlink: ${source} -> ${target}`);
      const linkResult = await ssh.execCommand(`echo "${password}" | sudo -S ln -s ${target} ${source}`);
      if (linkResult.code !== 0) {
        console.error(`Error creating symlink for ${folder}:`, linkResult.stderr);
      }
    }

    // 4. Final verification
    console.log('\n--- Final Verification ---');
    const verify = await ssh.execCommand('ls -la /DATA');
    console.log(verify.stdout);

    ssh.dispose();
  } catch(err) {
    console.error('Migration failed:', err);
    ssh.dispose();
  }
}

migrate();
