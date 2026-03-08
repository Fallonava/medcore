module.exports = {
  apps: [
    {
      name: 'medcore-admin',
      script: 'node',
      args: '.next/standalone/server.js',
      cwd: '/home/fallonava/admin-dashboard',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '400M',

      // ── Environment Variables ──────────────────────────────────────────────
      // These vars are MERGED with vars already loaded from the .env file.
      // Secrets (DATABASE_URL, JWT_SECRET, etc.) are written to
      // /home/fallonava/admin-dashboard/.env by the deploy script — NOT here.
      //
      // Only put non-secret, deployment-level vars here.
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        // HOSTNAME must be 0.0.0.0 so the process listens on all interfaces.
        // The redirect fix (using host header) means 0.0.0.0 no longer
        // leaks into browser-visible URLs.
        HOSTNAME: '0.0.0.0',

        // Explicitly set the public URL so internal automation fallback
        // can make API calls to itself. Keep this in sync with your domain.
        NEXT_PUBLIC_APP_URL: 'https://medcore.fallonava.my.id',
      },

      // ── Production log config ──────────────────────────────────────────────
      error_file: '/home/fallonava/logs/medcore-error.log',
      out_file: '/home/fallonava/logs/medcore-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,

      // ── Graceful shutdown ──────────────────────────────────────────────────
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 15000,

      // ── Restart policy ────────────────────────────────────────────────────
      // Exponential backoff: don't hammer the process if it's crash-looping
      exp_backoff_restart_delay: 100,
    },
  ],
};
