module.exports = {
  apps: [
    {
      name: 'trakovo',
      script: 'node_modules/.bin/next',
      args: 'start -p 3000',
      cwd: '/var/www/trakovo',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
}
