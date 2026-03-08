/**
 * deploy-manual.js
 *
 * Deploy script ke home server (CasaOS / Ubuntu @ 192.168.1.12)
 *
 * Usage: node deploy-manual.js
 *
 * Apa yang dilakukan:
 *  1. Upload archive source ke server
 *  2. Extract dan bersihkan direktori lama
 *  3. Upload .env.production.remote sebagai .env (lebih aman dari heredoc)
 *  4. Upload ecosystem.config.js terbaru
 *  5. npm install + npm run build di server
 *  6. Copy static assets ke standalone output
 *  7. Restart PM2 dengan delete+start (bukan reload) → dijamin bersih
 */

const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ssh = new NodeSSH();

const LOCAL_ROOT   = path.join('f:', 'Next', 'admin-dashboard');
const REMOTE_BASE  = '/home/fallonava/admin-dashboard';
const ARCHIVE_NAME = 'admin-dashboard.tar.gz';

async function deploy() {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 MedCore Deploy — Home Server (192.168.1.12)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // ── 1. Connect ───────────────────────────────────────────────────────────
    console.log('[1/7] Connecting to server...');
    await ssh.connect({
      host: '192.168.1.12',
      username: 'fallonava',
      password: '@Fallonava35',
      readyTimeout: 15000,
    });
    console.log('✅ Connected.\n');

    const remoteArchivePath = `/tmp/${ARCHIVE_NAME}`;

    // ── 2. Upload archive ────────────────────────────────────────────────────
    const localArchivePath = path.join(LOCAL_ROOT, ARCHIVE_NAME);
    if (!fs.existsSync(localArchivePath)) {
      throw new Error(`Archive not found: ${localArchivePath}\nBuat archive dulu dengan perintah:\n  npm run build && tar -czf admin-dashboard.tar.gz --exclude='.git' --exclude='node_modules' .`);
    }
    console.log(`[2/7] Uploading archive (${(fs.statSync(localArchivePath).size / 1024 / 1024).toFixed(1)} MB)...`);
    await ssh.putFile(localArchivePath, remoteArchivePath);
    console.log('✅ Uploaded.\n');

    // ── 3. Clean & extract ───────────────────────────────────────────────────
    console.log('[3/7] Extracting archive (fresh deploy)...');
    const extractResult = await ssh.execCommand(
      `rm -rf ${REMOTE_BASE} && mkdir -p ${REMOTE_BASE} && tar -xzf ${remoteArchivePath} -C ${REMOTE_BASE}`,
      { cwd: '/home/fallonava' }
    );
    if (extractResult.code !== 0) {
      throw new Error(`Extract failed:\n${extractResult.stderr}`);
    }
    console.log('✅ Extracted.\n');

    // ── 4. Upload .env (as a file — avoids heredoc issues with special chars) ─
    console.log('[4/7] Uploading .env...');
    const localEnvPath = path.join(LOCAL_ROOT, '.env.production.remote');
    if (!fs.existsSync(localEnvPath)) {
      throw new Error('.env.production.remote not found locally!');
    }
    await ssh.putFile(localEnvPath, `${REMOTE_BASE}/.env`);
    console.log('✅ .env uploaded.\n');

    // ── 5. Upload latest ecosystem.config.js ─────────────────────────────────
    console.log('[5/7] Uploading ecosystem.config.js...');
    await ssh.putFile(
      path.join(LOCAL_ROOT, 'ecosystem.config.js'),
      `${REMOTE_BASE}/ecosystem.config.js`
    );
    console.log('✅ ecosystem.config.js uploaded.\n');

    // ── 6. Install deps, build, copy static assets ───────────────────────────
    console.log('[6/7] Building on server (npm install + npm run build)...');
    console.log('      (This may take 2-5 minutes, please wait)\n');
    const buildCmd = `
      export HOME=/home/fallonava
      export NVM_DIR="$HOME/.nvm"
      [ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh"

      echo "Node: $(node -v)  npm: $(npm -v)"

      cd ${REMOTE_BASE}

      # Load env so Prisma can generate correctly
      sed -i 's/\\r$//' .env
      set -a && source .env && set +a

      npm install --prefer-offline 2>&1 | tail -5
      npm run build 2>&1

      # Copy static output so standalone server can find them
      cp -r .next/static  .next/standalone/.next/static  2>/dev/null || true
      cp -r public        .next/standalone/public         2>/dev/null || true
      mkdir -p /home/fallonava/logs

      echo "✅ Build complete"
    `;
    const buildResult = await ssh.execCommand(buildCmd, {
      cwd: REMOTE_BASE,
      onStdout: (chunk) => process.stdout.write(chunk.toString('utf8')),
      onStderr:  (chunk) => process.stderr.write(chunk.toString('utf8')),
    });
    if (buildResult.code !== 0) {
      throw new Error(`Build failed with exit code ${buildResult.code}`);
    }
    console.log('\n✅ Build succeeded.\n');

    // ── 7. PM2: stop old → start fresh (not reload, to pick up new env) ──────
    console.log('[7/7] Restarting PM2 (clean start)...');
    const pm2Cmd = `
      export HOME=/home/fallonava
      export NVM_DIR="$HOME/.nvm"
      [ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh"

      PM2=$(which pm2 2>/dev/null || echo "$HOME/.nvm/versions/node/$(node -v)/bin/pm2")
      echo "Using PM2: $PM2"

      # Delete the old process so the fresh ecosystem.config.js is picked up cleanly
      $PM2 delete medcore-admin 2>/dev/null || true

      # Start fresh with updated config
      cd ${REMOTE_BASE}
      $PM2 start ecosystem.config.js
      $PM2 save --force

      sleep 3
      $PM2 status medcore-admin
    `;
    const pm2Result = await ssh.execCommand(pm2Cmd, {
      cwd: REMOTE_BASE,
      onStdout: (chunk) => process.stdout.write(chunk.toString('utf8')),
      onStderr:  (chunk) => process.stderr.write(chunk.toString('utf8')),
    });

    // ── Cleanup temp archive ─────────────────────────────────────────────────
    await ssh.execCommand(`rm -f ${remoteArchivePath}`);
    ssh.dispose();

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (pm2Result.code === 0) {
      console.log('🎉 DEPLOY BERHASIL!');
      console.log(`   App → http://192.168.1.12:3000`);
      console.log(`   Domain → https://medcore.fallonava.my.id`);
    } else {
      console.log('⚠️  Deploy selesai tapi PM2 mungkin ada masalah.');
      console.log('   Cek log: pm2 logs medcore-admin --lines 50');
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (err) {
    console.error('\n❌ DEPLOY GAGAL:', err.message || err);
    ssh.dispose();
    process.exit(1);
  }
}

deploy();
