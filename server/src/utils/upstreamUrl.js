const SITE_HOSTS = ['exhentai.org', 'e-hentai.org']
// thumbnails (ehgt.org, s.exhentai.org) and full images (H@H *.hath.network)
const IMAGE_HOSTS = [...SITE_HOSTS, 'ehgt.org', 'hath.network']

function hostMatches(hostname, domains) {
  return domains.some((d) => hostname === d || hostname.endsWith('.' + d))
}

// A plain DNS name. The allowlist is checked on the WHATWG-parsed URL, but
// axios 0.21 connects to the host that the legacy url.parse() finds, and the
// two disagree on hosts such as "evil.test;.exhentai.org" or
// "evil.test%2eexhentai.org" (WHATWG: a subdomain of the site, legacy:
// evil.test). Anything outside [a-z0-9.-] is therefore refused.
const HOSTNAME =
  /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/

function parse(url) {
  if (typeof url !== 'string') return null
  // the raw authority must already be plain: no percent-escapes or
  // backslashes for one parser to decode and the other to keep
  const authority = /^https?:\/\/([^/?#]*)/i.exec(url)
  if (!authority || /[%\\\s]/.test(authority[1])) return null
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
    // no userinfo: never needed for images and another parser-differential vector
    if (u.username || u.password) return null
    if (!HOSTNAME.test(u.hostname)) return null
    return u
  } catch (e) {
    return null
  }
}

/**
 * The URL as serialized by the WHATWG parser, i.e. exactly the URL that was
 * checked. Pass this (not the raw query string) to axios.
 * @returns {string|null}
 */
function canonicalUrl(url) {
  const u = parse(url)
  return u ? u.href : null
}

/** true for an image URL this app may proxy (no SSRF to arbitrary hosts) */
function isAllowedImageUrl(url) {
  const u = parse(url)
  return !!u && hostMatches(u.hostname, IMAGE_HOSTS)
}

/**
 * true for a URL that should receive the user's site cookies: the site
 * itself, over https, on the default port (never in clear text over http,
 * never to some other service on a high port of the same host)
 */
function isSiteUrl(url) {
  const u = parse(url)
  return (
    !!u &&
    u.protocol === 'https:' &&
    u.port === '' &&
    hostMatches(u.hostname, SITE_HOSTS)
  )
}

/** true for an image page (/s/<imgkey>/<gid>-<n>) on e-hentai/exhentai */
function isImagePageUrl(url) {
  const u = parse(url)
  return (
    !!u &&
    u.protocol === 'https:' &&
    hostMatches(u.hostname, SITE_HOSTS) &&
    /^\/s\/[0-9a-f]+\/\d+-\d+$/.test(u.pathname)
  )
}

module.exports = {
  isAllowedImageUrl,
  isSiteUrl,
  isImagePageUrl,
  hostMatches,
  canonicalUrl,
}
