// server.js
require('dotenv').config()
const { resolveListenPort } = require('./config/listenPort')
const next = require('next')
const devProxy = {
  '/api': {
    target: 'http://localhost:8080', // API process (dev.bat / dev:server)
    changeOrigin: true,
  },
}

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

;(async () => {
  await app.prepare()

  const server = dev ? require('express')() : require('./app')
  if (dev && devProxy) {
    // dev-only: required lazily so a production install never needs them
    const { createProxyMiddleware } = require('http-proxy-middleware')
    const cookieParser = require('cookie-parser')
    server.use(cookieParser())
    Object.keys(devProxy).forEach(function (context) {
      server.use(createProxyMiddleware(context, devProxy[context]))
    })
  }

  server.all('*', (req, res) => {
    handle(req, res)
  })

  if (dev) {
    // Browser port: PORT, or EHV_HOST_PORT alias, default 3000 (see .env.example)
    const listenPort = resolveListenPort(process.env, { defaultPort: 3000 })
    server.listen(listenPort, () => {
      console.log(`app listening on http://localhost:${listenPort}`)
    })
  }
})()
