module.exports = {
  apps: [
    {
      name: 'medcore-admin',
      script: 'node',
      args: '.next/standalone/server.js',
      cwd: '/home/ubuntu/admin-dashboard',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '400M',

      // ── Environment Variables ──────────────────────────────────────────────
      // These are merged with any vars already set in the system environment.
      // Secrets (DATABASE_URL, JWT_SECRET, etc.) should be set via
      // /etc/environment or a .env.production.local file on the server —
      // NOT hardcoded here.
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',

        // App URL — required for internal API calls (automation fallback, etc.)
        // Set this to your actual production domain:
        NEXT_PUBLIC_APP_URL: 'https://your-domain.com',

        // Sentry release tracking (auto-set from git during deploy)
        // SENTRY_RELEASE is typically set by the CI pipeline via:
        //   pm2 reload ecosystem.config.js --update-env
        // Override here only if not using CI:
        // SENTRY_RELEASE: 'manual-version',
      },

      // ── Production log config ──────────────────────────────────────────────
      error_file: '/home/ubuntu/logs/medcore-error.log',
      out_file: '/home/ubuntu/logs/medcore-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,

      // ── Graceful shutdown ──────────────────────────────────────────────────
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },
  ],
};
