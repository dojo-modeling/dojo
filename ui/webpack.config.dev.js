const baseConfig = require('./webpack.config');

baseConfig.devServer.proxy = {
  '/api/terminal': {
    target: (process.env.TERMINAL_ENDPOINT ? process.env.TERMINAL_ENDPOINT : 'http://localhost:3000'),
    pathRewrite: { '^/api/terminal': '' },
    secure: false,
    changeOrigin: true,
  },
  '/api/ws': {
    target: (process.env.TERMINAL_ENDPOINT ? process.env.TERMINAL_ENDPOINT : 'http://localhost:3000'),
    pathRewrite: { '^/api': '' },
    secure: false,
    changeOrigin: true,
    ws: true,
  },
  '/api/dojo': {
    target: (process.env.DOJO_URL ? process.env.DOJO_URL : 'http://localhost:8000'),
    pathRewrite: { '^/api/dojo': '' },
    secure: false,
    changeOrigin: true,
  },
};
module.exports = baseConfig;
