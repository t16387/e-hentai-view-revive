const Cookie = require('jsdom').toughCookie.Cookie
function getCookieString(obj) {
  const arr = []
  Object.entries(obj).forEach(([key, value]) => {
    arr.push(`${key}=${value}`)
  })
  return arr.join('; ')
}

/**
 * Cookies the upstream site understands. Everything else the browser sends
 * to this app (analytics, NEXT_LOCALE, test cookies...) stays here.
 */
const UPSTREAM_COOKIES = [
  'ipb_member_id',
  'ipb_pass_hash',
  'ipb_session_id',
  'ipb_anonymous',
  'ipb_coppa',
  'igneous',
  'sk',
  'sl',
  's',
  'star',
  'hath_perks',
  'iq',
  'yay',
  'event',
]

/**
 * Cookie header for requests to e-hentai/exhentai: only known site cookies,
 * plus nw=1 so content-warning galleries render directly instead of the
 * "Offensive For Everyone" interstitial.
 */
function upstreamCookieString(reqCookies = {}) {
  const picked = {}
  UPSTREAM_COOKIES.forEach((key) => {
    const value = reqCookies && reqCookies[key]
    if (value !== undefined && value !== '') picked[key] = value
  })
  picked.nw = '1'
  return getCookieString(picked)
}

function parseCookieToJSON(arr = []) {
  const res = {}
  arr.forEach((cookieString) => {
    const cookie = Cookie.parse(cookieString)
    res[cookie.key] = cookie.value
  })
  return res
}

module.exports = {
  getCookieString,
  upstreamCookieString,
  parseCookieToJSON,
  UPSTREAM_COOKIES,
}
