const express = require('express')
const {
  login,
  validateLogin,
  getUserSetting,
  attachIgneous,
} = require('./userApi')
const {
  getCookieString,
  upstreamCookieString,
  userCacheScope,
  UPSTREAM_COOKIES,
} = require('../utils/cookies')
const {
  SITE_IDS,
  normalizeSiteName,
  getSite,
  getSiteConfig,
  envSiteName,
} = require('../config/api')
const cache = require('../cache')
const router = express.Router()

/** HttpOnly + SameSite=Lax; Secure when the request itself is https */
const cookieOption = (req) => {
  const proto = (
    req.headers['x-forwarded-proto'] ||
    req.protocol ||
    ''
  ).toString()
  const secure =
    proto.split(',')[0].trim() === 'https' ||
    !!(req.secure || req.headers['x-forwarded-ssl'] === 'on')
  return {
    maxAge: 6 * 31 * 24 * 60 * 60 * 1000,
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure,
  }
}

/** Preference cookie is readable by the SPA (not a secret) */
const sitePrefCookieOption = (req) => {
  const base = cookieOption(req)
  return { ...base, httpOnly: false }
}

router.post('/login', async (req, res) => {
  const { UserName, PassWord, method, ipb_member_id, ipb_pass_hash, igneous } =
    req.body
  const siteName = getSite().siteName

  let content = ''
  let userCookie = {}

  if (method === 'cookie') {
    content = await validateLogin(
      { ipb_member_id, ipb_pass_hash, igneous },
      siteName
    )
    userCookie = await attachIgneous({
      ipb_member_id,
      ipb_pass_hash,
      igneous,
    })
  } else {
    // In-app username/password: server POSTs to forums and stores Set-Cookie
    // as HttpOnly on this origin. May fail with Cloudflare on some egress IPs.
    const { message, cookie } = await login({ UserName, PassWord })
    content = message
    userCookie = cookie
  }

  const { cookie: setingCookie } = await getUserSetting(
    getCookieString(userCookie),
    siteName
  )
  Object.entries({ ...setingCookie, ...userCookie }).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    // Only persist known upstream names (never FlareSolverr clearance, etc.)
    if (!UPSTREAM_COOKIES.includes(key)) return
    if (key === 'igneous' && value === 'mystery')
      throw new Error('[login faild] User cookie "igneous" value error')
    res.cookie(key, value, cookieOption(req))
  })
  res.send({ error: false, message: content })
})

router.post('/setting', async (req, res) => {
  const { cookie } = await getUserSetting(
    upstreamCookieString(req.cookies),
    getSite().siteName
  )
  Object.entries(cookie).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    if (!UPSTREAM_COOKIES.includes(key)) return
    res.cookie(key, value, cookieOption(req))
  })

  cache.del(
    cache.keys().filter((v) => v.includes(`[g${userCacheScope(req.cookies)}]`))
  )
  res.send({ error: false, message: 'fresh setting success' })
})

router.post('/logout', async (req, res) => {
  Object.keys(req.cookies).forEach((key) => {
    res.clearCookie(key)
  })

  res.send({ error: false, message: 'logged out' })
})

/**
 * HttpOnly cookies are invisible to document.cookie; the settings UI reads
 * them here instead. Only known upstream names are returned.
 */
router.get('/cookies', async (req, res) => {
  const cookies = {}
  UPSTREAM_COOKIES.forEach((key) => {
    const value = req.cookies && req.cookies[key]
    if (value !== undefined && value !== '') cookies[key] = value
  })
  res.json({ error: false, cookies })
})

/**
 * Current upstream site preference (request-resolved) and available ids.
 */
router.get('/site', async (req, res) => {
  const site = getSite()
  res.json({
    error: false,
    site: site.siteName,
    requiresLogin: site.requiresLogin,
    sites: SITE_IDS,
    envDefault: envSiteName(),
  })
})

/**
 * Persist site preference (cookie + optional client header). Switching to
 * exhentai requires login cookies; missing igneous is reported clearly.
 */
router.post('/site', async (req, res) => {
  const requested =
    normalizeSiteName(req.body && req.body.site) ||
    normalizeSiteName(req.body && req.body.siteName)
  if (!requested) {
    return res.status(400).json({
      error: true,
      message: 'site must be e-hentai or exhentai',
    })
  }
  const site = getSiteConfig(requested)
  if (site.requiresLogin) {
    const c = req.cookies || {}
    if (!c.ipb_member_id || !c.ipb_pass_hash) {
      return res.json({
        error: true,
        code: 'no login',
        message: 'Sign in first before switching to exhentai.org',
      })
    }
    if (!c.igneous || c.igneous === 'mystery') {
      return res.json({
        error: true,
        code: 'sad panda',
        message:
          'exhentai needs a valid igneous cookie. Sign in again after the server can reach exhentai, or use Advanced cookie login and include igneous.',
      })
    }
  }
  res.cookie('ehv_site', requested, sitePrefCookieOption(req))
  res.json({
    error: false,
    site: requested,
    requiresLogin: site.requiresLogin,
    message: `Using ${requested}`,
  })
})

router.get('/test/cookie', async (req, res) => {
  if (req.cookies.test) {
    res.clearCookie('test')
    res.json({ error: false, message: 'success' })
  } else res.json({ error: true, message: 'cookie no set' })
})
router.post('/test/cookie', async (req, res) => {
  res.cookie('test', true, { ...cookieOption(req), maxAge: 180 * 1000 })
  res.json({ error: false, message: 'cookie set' })
})

module.exports = router
