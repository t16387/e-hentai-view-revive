const { loginURL, getSite, getSiteConfig } = require('../config/api')
const {
  fetchPage,
  isCloudflareChallenge,
  UpstreamError,
} = require('../utils/fetchPage')
const axios = require('../axios')
const qs = require('qs')
const { getCookieString, parseCookieToJSON } = require('../utils/cookies')
const { parseLogin, parseCookieLogin } = require('./userPrser')

const FORUMS_BLOCKED =
  'forums.e-hentai.org answered with a Cloudflare challenge. In-app password login cannot complete from this server. Use Advanced → cookie login, or set EHV_PROXY to an egress that can pass the forums challenge.'

const LOGIN_HEADERS = {
  'Content-Type': 'application/x-www-form-urlencoded',
  Origin: 'https://e-hentai.org',
  Referer: 'https://e-hentai.org/bounce_login.php?b=d&bt=1-1',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}

/**
 * POST username/password to the forums login endpoint.
 * Never log PassWord / Set-Cookie values.
 * On success, optionally attach igneous by visiting exhentai.
 */
async function login(payload) {
  const { UserName, PassWord } = payload || {}
  if (!UserName || !PassWord) {
    throw new UpstreamError('validation', 'Username and password are required')
  }

  const res = await axios.request({
    url: `${loginURL}?act=Login&CODE=01`,
    validateStatus: () => true,
    method: 'POST',
    headers: LOGIN_HEADERS,
    maxRedirects: 0,
    data: qs.stringify({
      referer: 'https://e-hentai.org/bounce_login.php?b=d&bt=1-1',
      b: 'd',
      bt: '1-1',
      CookieDate: 1,
      UserName,
      PassWord,
      ipb_login_submit: 'Login!',
    }),
  })

  if (isCloudflareChallenge(res)) {
    throw new UpstreamError('cloudflare', FORUMS_BLOCKED)
  }

  const message = parseLogin(typeof res.data === 'string' ? res.data : '')
  const cookie = parseCookieToJSON(res.headers['set-cookie'])

  if (!cookie.ipb_member_id || !cookie.ipb_pass_hash) {
    throw new UpstreamError(
      'login',
      'Login succeeded but no session cookies were returned. Try Advanced cookie login.'
    )
  }

  const withIgneous = await attachIgneous(cookie)
  return { message, cookie: withIgneous }
}

/**
 * After forums login (or when igneous is missing), visit exhentai once so the
 * Set-Cookie chain can yield igneous. Forums remoteapi may still hit Cloudflare;
 * failures are non-fatal for e-hentai-only use.
 */
async function attachIgneous(cookie) {
  if (cookie.igneous && cookie.igneous !== 'mystery') return cookie
  try {
    const igneous = await fetchIgneous(cookie)
    if (igneous) return { ...cookie, igneous }
  } catch (_) {
    /* optional for e-hentai */
  }
  return cookie
}

async function fetchIgneous(cookie) {
  const cookieHeader = getCookieString({
    ipb_member_id: cookie.ipb_member_id,
    ipb_pass_hash: cookie.ipb_pass_hash,
    ...(cookie.igneous ? { igneous: cookie.igneous } : {}),
  })

  let res = await axios.get('https://exhentai.org/', {
    headers: { Cookie: cookieHeader + '; nw=1' },
    maxRedirects: 0,
    validateStatus: () => true,
  })

  if (isCloudflareChallenge(res)) return null

  let parsed = parseCookieToJSON(res.headers['set-cookie'])
  if (parsed.igneous && parsed.igneous !== 'mystery') return parsed.igneous

  const loc = res.headers && (res.headers.location || res.headers.Location)
  if (res.status >= 300 && res.status < 400 && loc) {
    const next = loc.startsWith('http') ? loc : `https://exhentai.org${loc}`
    res = await axios.get(next, {
      headers: { Cookie: cookieHeader + '; nw=1' },
      maxRedirects: 0,
      validateStatus: () => true,
    })
    if (isCloudflareChallenge(res)) return null
    parsed = parseCookieToJSON(res.headers['set-cookie'])
    if (parsed.igneous && parsed.igneous !== 'mystery') return parsed.igneous
  }
  return null
}

async function validateLogin(
  { ipb_member_id, ipb_pass_hash, igneous },
  siteName
) {
  const site = getSiteConfig(siteName || getSite().siteName)
  const cookie = { ipb_member_id, ipb_pass_hash }
  if (igneous) cookie.igneous = igneous
  const cookies = getCookieString(cookie)
  let res = null
  try {
    res = await axios.get(loginURL, {
      headers: { Cookie: cookies },
      validateStatus: () => true,
    })
  } catch (e) {
    res = null
  }
  if (res && res.status === 200 && !isCloudflareChallenge(res)) {
    return parseCookieLogin(res.data)
  }
  // the forums are unreachable from servers (Cloudflare): verify the
  // cookies against the gallery site itself instead
  return validateOnSite(cookies, site)
}

/** read-only check that the cookies are accepted by the configured site */
async function validateOnSite(cookies, site) {
  const { siteName, baseURL } = site || getSite()
  if (siteName === 'exhentai') {
    // throws [sad panda] when exhentai rejects the cookies
    const { document } = await fetchPage(`${baseURL}/`, {
      cookies: cookies + '; nw=1',
      siteName,
    })
    if (!document.querySelector('table.itg, div.itg, #searchbox')) {
      throw new Error('Login faild. exhentai did not return the gallery index')
    }
    return 'You are now logged in (verified on exhentai.org)'
  }
  // e-hentai: home.php needs a login, anonymous requests are redirected
  const res = await axios.get('https://e-hentai.org/home.php', {
    headers: { Cookie: cookies },
    maxRedirects: 0,
    validateStatus: () => true,
  })
  if (res.status !== 200) {
    throw new Error(
      'Login faild. The cookies may be de wrong, please try again'
    )
  }
  return 'You are now logged in (verified on e-hentai.org)'
}

async function getUserSetting(cookie, siteName) {
  const { configURL } = getSiteConfig(siteName || getSite().siteName)
  const res = await axios.get(configURL, { headers: { Cookie: cookie } })
  return { cookie: parseCookieToJSON(res.headers['set-cookie']) }
}

module.exports = {
  login,
  validateLogin,
  getUserSetting,
  attachIgneous,
  fetchIgneous,
}
