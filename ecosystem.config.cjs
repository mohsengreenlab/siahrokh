module.exports = {
  apps: [{
    name: 'siahrokh',
    script: './dist/index.js',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3007,
      DATABASE_URL: 'postgresql://siahrokh_user:gesfvRGFREFWef3423@localhost:5432/siahrokh_db'
    },
    watch: false,
    ignore_watch: ['node_modules','uploads','logs']
  }]
};
