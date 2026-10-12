require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
// const cors = require('cors')
require('express-async-errors')
const cookieParser = require('cookie-parser')
const app = express()
const listEndpoints = require('express-list-endpoints')
const { envSiteName, resolveSiteFromReq, runWithSite } = require('./config/api')
// const { isNil } = require('lodash')

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

// parse cookies
app.use(cookieParser())

/**
 * Path only (no query string) in lower case, so `/API/gallery` cannot skip
 * the login gate and logs never print image keys / search terms.
 */
function apiPath(req) {
  const raw = (req.originalUrl || req.url || '').split('?')[0]
  return raw.toLowerCase()
}

/**
 * CSRF for cookie-authenticated state changes: SameSite=Lax already blocks
 * cross-site form POSTs; also require a same-origin Origin/Referer or the
 * custom X-EHV-CSRF header the SPA always sends.
 */
function csrfOk(req) {
  if (req.get('x-ehv-csrf') === '1') return true
  const host = (req.get('host') || '').toLowerCase()
  if (!host) return false
  const origin = req.get('origin')
  if (origin) {
    try {
      return new URL(origin).host.toLowerCase() === host
    } catch (e) {
      return false
    }
  }
  const referer = req.get('referer')
  if (referer) {
    try {
      return new URL(referer).host.toLowerCase() === host
    } catch (e) {
      return false
    }
  }
  // non-browser clients (tests, curl) with neither header: allow only when
  // there is no cookie session yet (login) — still require the custom header
  // once we standardise the SPA. Reject bare cross-site-looking posts.
  return false
}

const CSRF_PATHS = [
  '/api/user/login',
  '/api/user/logout',
  '/api/user/setting',
  '/api/user/site',
]

app.use((req, res, next) => {
  const site = resolveSiteFromReq(req)
  req.ehvSite = site
  runWithSite(site, () => {
    const path = apiPath(req)
    if (path.startsWith('/api')) console.log('%s -> %s', req.method, path)

    if (
      (req.method === 'POST' ||
        req.method === 'PUT' ||
        req.method === 'PATCH' ||
        req.method === 'DELETE') &&
      CSRF_PATHS.some((p) => path === p || path.startsWith(p + '/'))
    ) {
      if (!csrfOk(req)) {
        return res.status(403).json({ error: true, message: 'csrf rejected' })
      }
    }

    // exhentai needs a logged-in account; the public e-hentai site does not
    if (
      site.requiresLogin &&
      path.startsWith('/api/') &&
      !path.startsWith('/api/user')
    ) {
      if (req.cookies && !req.cookies.ipb_member_id) {
        return res.json({ error: true, message: 'No login' })
      }
    }
    next()
  })
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

const { resolveListenPort } = require('./config/listenPort')
const PORT = resolveListenPort(process.env, { defaultPort: 8080 })
app.listen(PORT, () => {
  console.log(
    `app listening on http://localhost:${PORT}, env: ${
      process.env.NODE_ENV
    }, site default: ${envSiteName()}`
  )
})

module.exports = app
