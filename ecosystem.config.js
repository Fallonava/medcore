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
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
      },
      error_file: '/home/ubuntu/logs/medcore-error.log',
      out_file: '/home/ubuntu/logs/medcore-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
