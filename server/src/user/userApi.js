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
const flare = require('./flareSolverr')

const FORUMS_BLOCKED =
  'forums.e-hentai.org answered with a Cloudflare challenge. Set EHV_FLARESOLVERR_URL to a reachable FlareSolverr /v1 endpoint (see DOCKER.md), or use Advanced → cookie login.'

const LOGIN_HEADERS = {
  'Content-Type': 'application/x-www-form-urlencoded',
  Origin: 'https://e-hentai.org',
  Referer: 'https://e-hentai.org/bounce_login.php?b=d&bt=1-1',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}

const FORUMS_LOGIN_GET = `${loginURL}?act=Login&CODE=00`
const FORUMS_LOGIN_POST = `${loginURL}?act=Login&CODE=01`

function buildLoginPostData(UserName, PassWord) {
  return qs.stringify({
    referer: 'https://e-hentai.org/bounce_login.php?b=d&bt=1-1',
    b: 'd',
    bt: '1-1',
    CookieDate: 1,
    UserName,
    PassWord,
    ipb_login_submit: 'Login!',
  })
}

function finishFromHtmlAndCookies(html, cookieObj) {
  const message = parseLogin(typeof html === 'string' ? html : '')
  const cookie = { ...cookieObj }
  if (!cookie.ipb_member_id || !cookie.ipb_pass_hash) {
    throw new UpstreamError(
      'login',
      'Login response had no session cookies. Try Advanced cookie login.'
    )
  }
  return { message, cookie }
}

/**
 * Password login via FlareSolverr (when EHV_FLARESOLVERR_URL is set).
 * 1) Prefer request.post (official FlareSolverr).
 * 2) Else session + GET (Turnstile) then request.post with cookies.
 * 3) Else GET clearance then direct axios POST with solver UA + cookies.
 */
async function loginViaFlareSolverr(UserName, PassWord) {
  const postData = buildLoginPostData(UserName, PassWord)
  let lastErr = null

  // --- 1) direct request.post ---
  try {
    const result = await flare.solverPost(FORUMS_LOGIN_POST, postData, {
      maxTimeout: 120000,
    })
    if (!/Just a moment/i.test(result.html)) {
      const finished = finishFromHtmlAndCookies(result.html, result.cookies)
      finished.cookie = await attachIgneous(finished.cookie)
      return finished
    }
    lastErr = new UpstreamError(
      'flaresolverr',
      'FlareSolverr POST still returned a Cloudflare challenge page'
    )
  } catch (e) {
    lastErr = e
  }

  // --- 2) persistent session: GET (tabs_till_verify) then POST ---
  let session = null
  try {
    session = await flare.createSession()
    const cleared = await flare.solverGet(FORUMS_LOGIN_GET, {
      session,
      maxTimeout: 120000,
      tabsTillVerify: 1,
    })
    if (/Just a moment/i.test(cleared.html)) {
      throw new UpstreamError(
        'flaresolverr',
        'FlareSolverr could not clear the forums Cloudflare/Turnstile challenge'
      )
    }

    try {
      const posted = await flare.solverPost(FORUMS_LOGIN_POST, postData, {
        session,
        cookies: cleared.cookies,
        maxTimeout: 120000,
      })
      const finished = finishFromHtmlAndCookies(posted.html, {
        ...cleared.cookies,
        ...posted.cookies,
      })
      finished.cookie = await attachIgneous(finished.cookie)
      return finished
    } catch (postErr) {
      // Byparr has no request.post — fall through to axios POST with clearance
      if (postErr && postErr.code === 'flaresolverr') {
        const axiosResult = await loginWithClearance(
          UserName,
          PassWord,
          cleared.cookies,
          cleared.userAgent
        )
        return axiosResult
      }
      throw postErr
    }
  } catch (e) {
    lastErr = e
  } finally {
    await flare.destroySession(session)
  }

  // --- 3) GET without session, then axios POST ---
  try {
    const cleared = await flare.solverGet(FORUMS_LOGIN_GET, {
      maxTimeout: 120000,
      tabsTillVerify: 1,
    })
    if (/Just a moment/i.test(cleared.html)) {
      throw new UpstreamError(
        'flaresolverr',
        'FlareSolverr could not clear the forums Cloudflare/Turnstile challenge'
      )
    }
    return await loginWithClearance(
      UserName,
      PassWord,
      cleared.cookies,
      cleared.userAgent
    )
  } catch (e) {
    lastErr = e
  }

  if (lastErr) throw lastErr
  throw new UpstreamError(
    'flaresolverr',
    'FlareSolverr login failed for an unknown reason'
  )
}

/** Direct POST using CF clearance cookies + matching User-Agent from the solver */
async function loginWithClearance(
  UserName,
  PassWord,
  clearanceCookies,
  userAgent
) {
  const cookieHeader = flare.cookieHeaderFromObj(clearanceCookies)
  const res = await axios.request({
    url: FORUMS_LOGIN_POST,
    validateStatus: () => true,
    method: 'POST',
    headers: {
      ...LOGIN_HEADERS,
      ...(userAgent ? { 'User-Agent': userAgent } : {}),
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
    maxRedirects: 0,
    data: buildLoginPostData(UserName, PassWord),
  })

  if (isCloudflareChallenge(res)) {
    throw new UpstreamError(
      'flaresolverr',
      'Clearance cookies from FlareSolverr were not accepted for the login POST (Cloudflare challenged again). Try updating FlareSolverr or use Advanced cookie login.'
    )
  }

  const fromHeaders = parseCookieToJSON(res.headers['set-cookie'])
  const finished = finishFromHtmlAndCookies(
    typeof res.data === 'string' ? res.data : '',
    { ...clearanceCookies, ...fromHeaders }
  )
  finished.cookie = await attachIgneous(finished.cookie)
  return finished
}

async function loginDirect(UserName, PassWord) {
  const res = await axios.request({
    url: FORUMS_LOGIN_POST,
    validateStatus: () => true,
    method: 'POST',
    headers: LOGIN_HEADERS,
    maxRedirects: 0,
    data: buildLoginPostData(UserName, PassWord),
  })

  if (isCloudflareChallenge(res)) {
    throw new UpstreamError('cloudflare', FORUMS_BLOCKED)
  }

  const cookie = parseCookieToJSON(res.headers['set-cookie'])
  const finished = finishFromHtmlAndCookies(
    typeof res.data === 'string' ? res.data : '',
    cookie
  )
  finished.cookie = await attachIgneous(finished.cookie)
  return finished
}

/**
 * POST username/password to the forums login endpoint.
 * Never log PassWord / Set-Cookie values.
 */
async function login(payload) {
  const { UserName, PassWord } = payload || {}
  if (!UserName || !PassWord) {
    throw new UpstreamError('validation', 'Username and password are required')
  }

  if (flare.isConfigured()) {
    return loginViaFlareSolverr(UserName, PassWord)
  }
  return loginDirect(UserName, PassWord)
}

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
  return validateOnSite(cookies, site)
}

async function validateOnSite(cookies, site) {
  const { siteName, baseURL } = site || getSite()
  if (siteName === 'exhentai') {
    const { document } = await fetchPage(`${baseURL}/`, {
      cookies: cookies + '; nw=1',
      siteName,
    })
    if (!document.querySelector('table.itg, div.itg, #searchbox')) {
      throw new Error('Login faild. exhentai did not return the gallery index')
    }
    return 'You are now logged in (verified on exhentai.org)'
  }
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
  loginViaFlareSolverr,
  loginDirect,
}
