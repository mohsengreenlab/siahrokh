module.exports = {
  apps: [{
    name: 'siahrokh',
    script: './dist/index.js',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3007,
      DATABASE_URL: '<YOUR_POSTGRES_URL>'
    },
    watch: false,
    ignore_watch: ['node_modules','uploads','logs']
  }]
};
