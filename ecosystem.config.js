module.exports = {
  apps: [
    {
      name: 'helpdesk-backend',
      cwd: './app-backend',
      script: 'dist/main.js',
      instances: 'max',       // Utilize all available CPU cores for clustering
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      max_memory_restart: '500M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
    {
      name: 'helpdesk-frontend',
      cwd: './app-frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      max_memory_restart: '500M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    }
  ]
};
