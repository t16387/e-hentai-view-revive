const SITE_HOSTS = ['exhentai.org', 'e-hentai.org']
// thumbnails (ehgt.org, s.exhentai.org) and full images (H@H *.hath.network)
const IMAGE_HOSTS = [...SITE_HOSTS, 'ehgt.org', 'hath.network']

function hostMatches(hostname, domains) {
  return domains.some((d) => hostname === d || hostname.endsWith('.' + d))
}

function parse(url) {
  try {
    const u = new URL(String(url))
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
    return u
  } catch (e) {
    return null
  }
}

/** true for an image URL this app may proxy (no SSRF to arbitrary hosts) */
function isAllowedImageUrl(url) {
  const u = parse(url)
  return !!u && hostMatches(u.hostname, IMAGE_HOSTS)
}

/** true for a host that should receive the user's site cookies */
function isSiteUrl(url) {
  const u = parse(url)
  return !!u && hostMatches(u.hostname, SITE_HOSTS)
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

module.exports = { isAllowedImageUrl, isSiteUrl, isImagePageUrl, hostMatches }
