const dns = require('dns').promises
const { isPrivateIp, isHathHostname } = require('./privateIp')
const { canonicalUrl } = require('./upstreamUrl')

/**
 * For *.hath.network image hosts: resolve DNS and refuse private /
 * loopback / link-local answers (SSRF via DNS rebinding). Other allowlisted
 * hosts are left to the static allowlist + redirect-hop checks.
 */
async function assertPublicImageHost(url) {
  const href = canonicalUrl(url)
  if (!href) {
    const err = new Error('invalid image url')
    err.code = 'EBADURL'
    throw err
  }
  const { hostname } = new URL(href)
  if (!isHathHostname(hostname)) return href
  let records
  try {
    records = await dns.lookup(hostname, { all: true, verbatim: true })
  } catch (e) {
    const err = new Error('image host DNS lookup failed')
    err.code = 'EDNS'
    throw err
  }
  if (!records.length) {
    const err = new Error('image host DNS returned no addresses')
    err.code = 'EDNS'
    throw err
  }
  for (const r of records) {
    if (isPrivateIp(r.address)) {
      const err = new Error('image host resolves to a private address')
      err.code = 'EPRIVATE'
      throw err
    }
  }
  return href
}

module.exports = { assertPublicImageHost }
