const express = require('express')
const bodyParser = require('body-parser')
// const cors = require('cors')
require('express-async-errors')
const cookieParser = require('cookie-parser')
const app = express()
const listEndpoints = require('express-list-endpoints')
const { requiresLogin, siteName } = require('./config/api')
// const { isNil } = require('lodash')

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

// parse cookies
app.use(cookieParser())

app.use((req, res, next) => {
  if (req.url.startsWith('/api')) console.log('%s -> %s', req.method, req.url)

  // exhentai needs a logged-in account; the public e-hentai site does not
  if (
    requiresLogin &&
    req.url.startsWith('/api/') &&
    !req.url.startsWith('/api/user')
  ) {
    if (req.cookies && !req.cookies.ipb_member_id) {
      return res.json({ error: true, message: 'No login' })
    }
  }
  next()
})
app.get('/api', async (req, res) => {
  res.send(`<pre>${JSON.stringify(listEndpoints(app), null, 2)}</pre>`)
})

app.use('/api/gallery', require('./gallery/galleryRouter'))
app.use('/api/popular', require('./popular/popularRouter'))
app.use('/api/watched', require('./watched/watchedRouter'))
app.use('/api/favorites', require('./favorites/favoritesRouter'))
app.use('/api/user', require('./user/userRouter'))

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Log only the message: a raw axios error carries the request config,
  // including the user's Cookie header, and must never reach the logs.
  console.error('[api] %s %s -> %s', req.method, req.path, err && err.message)
  let message = (err && err.message) || 'error'
  if (message === 'Request failed with status code 302') {
    message = 'no login'
  }
  res.status(200).send({ error: true, code: err && err.code, message })
})

const PORT = process.env.PORT || 8080
app.listen(PORT, () => {
  console.log(
    `app listening on http://localhost:${PORT}, env: ${process.env.NODE_ENV}, site: ${siteName}`
  )
})

module.exports = app
