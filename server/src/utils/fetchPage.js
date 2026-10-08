const axios = require('../axios')
const { JSDOM } = require('jsdom')

/** Error with a stable machine-readable code for the API response */
class UpstreamError extends Error {
  constructor(code, message) {
    super(`[${code}] ${message}`)
    this.code = code
  }
}

function header(res, name) {
  const v = res && res.headers && res.headers[name]
  return Array.isArray(v) ? v.join('\n') : v || ''
}

/** Cloudflare managed challenge (forums.e-hentai.org answers server requests with it) */
function isCloudflareChallenge(res) {
  if (!res) return false
  const body = typeof res.data === 'string' ? res.data : ''
  return (
    header(res, 'cf-mitigated') === 'challenge' ||
    ((res.status === 403 || res.status === 503) &&
      /_cf_chl_opt|Just a moment\.\.\./.test(body))
  )
}

/**
 * Classify a response from e-hentai / exhentai that is not a usable HTML page.
 * Returns an UpstreamError or null.
 * - sad panda: exhentai without valid cookies answers with an image, an empty
 *   body, a redirect without body, or sets igneous=mystery
 */
function classifyBadPage(res, { siteName = 'exhentai' } = {}) {
  const type = header(res, 'content-type')
  const body = typeof res.data === 'string' ? res.data : ''
  if (isCloudflareChallenge(res))
    return new UpstreamError(
      'cloudflare',
      'upstream answered with a Cloudflare challenge'
    )
  if (/igneous=mystery/.test(header(res, 'set-cookie')))
    return new UpstreamError(
      'sad panda',
      'igneous cookie rejected (igneous=mystery); log in again with fresh cookies'
    )
  if (/^image\//.test(type))
    return new UpstreamError(
      'sad panda',
      `got an image instead of a page from ${siteName}; the login cookies are missing or not accepted`
    )
  if (
    /temporarily banned|Your IP address has been temporarily banned/i.test(
      body.slice(0, 2000)
    )
  )
    return new UpstreamError('banned', 'upstream reports a temporary IP ban')
  if (res.status >= 300 && res.status < 400)
    return new UpstreamError(
      siteName === 'exhentai' ? 'sad panda' : 'redirect',
      `upstream redirected (${res.status}); the login cookies are missing or not accepted`
    )
  if (
    res.status === 404 ||
    /^Key missing, or incorrect key provided\.?$/.test(body.trim())
  )
    return new UpstreamError('404', 'gallery not found or wrong token')
  if (res.status >= 400)
    return new UpstreamError(`http ${res.status}`, 'upstream error')
  if (body.trim() === '')
    return new UpstreamError(
      'sad panda',
      `empty page from ${siteName}; the login cookies are missing or not accepted`
    )
  return null
}

/**
 * GET an upstream HTML page and return { res, document }. Throws UpstreamError
 * instead of handing a sad-panda image / empty body to the parsers (which
 * silently produced empty lists before).
 */
async function fetchPage(url, { cookies, params, siteName } = {}) {
  let target = url
  let query = params
  let res
  // follow at most 2 same-host redirects (e.g. a missing trailing slash);
  // a redirect to another host (exhentai without login) is a sad panda
  for (let hop = 0; hop < 3; hop++) {
    res = await axios.get(target, {
      params: query,
      headers: cookies ? { Cookie: cookies } : {},
      responseType: 'text',
      transformResponse: [(d) => d],
      validateStatus: () => true,
      maxRedirects: 0,
    })
    const location = header(res, 'location')
    if (res.status < 300 || res.status >= 400 || !location) break
    const next = new URL(location, target)
    if (next.host !== new URL(target).host) break
    target = next.toString()
    query = undefined
  }
  const bad = classifyBadPage(res, { siteName })
  if (bad) throw bad
  const document = new JSDOM(res.data).window.document
  return { res, document, html: res.data }
}

module.exports = {
  fetchPage,
  classifyBadPage,
  isCloudflareChallenge,
  UpstreamError,
}
