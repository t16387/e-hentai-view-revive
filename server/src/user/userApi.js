const { loginURL, configURL, baseURL, siteName } = require('../config/api')
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
  'forums.e-hentai.org answers server requests with a Cloudflare challenge'

async function login(payload) {
  const res = await axios.request({
    url: `${loginURL}?act=Login&CODE=01`,
    validateStatus: () => true,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    maxRedirects: 0,
    data: qs.stringify({
      referer: loginURL,
      b: '',
      bt: '',
      CookieDate: 1,
      ...payload,
    }),
  })

  if (isCloudflareChallenge(res)) {
    throw new UpstreamError(
      'cloudflare',
      `${FORUMS_BLOCKED}; password login is unavailable, use cookie login`
    )
  }
  return {
    message: parseLogin(res.data),
    cookie: parseCookieToJSON(res.headers['set-cookie']),
  }
}

async function validateLogin({ ipb_member_id, ipb_pass_hash, igneous }) {
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
  return validateOnSite(cookies)
}

/** read-only check that the cookies are accepted by the configured site */
async function validateOnSite(cookies) {
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

async function getUserSetting(cookie) {
  const res = await axios.get(configURL, { headers: { Cookie: cookie } })
  return { cookie: parseCookieToJSON(res.headers['set-cookie']) }
}
module.exports = { login, validateLogin, getUserSetting }
