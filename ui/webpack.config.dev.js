const baseConfig = require('./webpack.config');


baseConfig.devServer.proxy = {
  '/api/terminal': {
    target: (process.env.TERMINAL_API_ENDPOINT ? process.env.TERMINAL_API_ENDPOINT : 'http://localhost:3000'),
    pathRewrite: { '^/api/terminal': '' },
    secure: false,
    changeOrigin: true,
  },
  '/api/ws': {
    target: (process.env.TERMINAL_API_ENDPOINT ? process.env.TERMINAL_API_ENDPOINT : 'http://localhost:3000'),
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
  '/api/templater': {
    target: (process.env.TEMPLATER_URL ? process.env.TEMPLATER_URL : 'http://localhost:5000'),
    pathRewrite: { '^/api/templater': '' },
    secure: false,
    changeOrigin: true,
  },
  '/api/annotate': {
    target: (process.env.ANNOTATE_URL ? process.env.ANNOTATE_URL : 'http://localhost:8001'),
    pathRewrite: { '^/api/annotate': '' },
    secure: false,
    changeOrigin: true,
  },
};
module.exports = baseConfig;
