// server.js
const next = require('next')
const devProxy = {
  '/api': {
    target: 'http://localhost:8080', // 端口自己配置合适的
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
    server.listen(3000, () => {
      console.log(`app listening on http://localhost:3000`)
    })
  }
})()
