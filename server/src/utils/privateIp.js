const net = require('net')

/** true for loopback, link-local, private, or otherwise non-public addresses */
function isPrivateIp(ip) {
  if (!ip || typeof ip !== 'string') return true
  const v = ip.toLowerCase().replace(/^\[|\]$/g, '')
  if (net.isIPv4(v)) {
    const p = v.split('.').map((x) => parseInt(x, 10))
    if (p.some((n) => Number.isNaN(n))) return true
    if (p[0] === 0 || p[0] === 10 || p[0] === 127) return true
    if (p[0] === 169 && p[1] === 254) return true
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true
    if (p[0] === 192 && p[1] === 168) return true
    if (p[0] === 100 && p[1] >= 64 && p[1] <= 127) return true // CGNAT
    if (p[0] >= 224) return true // multicast / reserved
    return false
  }
  if (net.isIPv6(v)) {
    if (v === '::1' || v === '::' || v === '0:0:0:0:0:0:0:1') return true
    if (v.startsWith('fe80:') || v.startsWith('fe80::')) return true // link-local
    if (v.startsWith('fc') || v.startsWith('fd')) return true // ULA
    if (v.startsWith('::ffff:')) {
      return isPrivateIp(v.slice(7))
    }
    return false
  }
  return true
}

function isHathHostname(hostname) {
  return (
    typeof hostname === 'string' &&
    (hostname === 'hath.network' || hostname.endsWith('.hath.network'))
  )
}

module.exports = { isPrivateIp, isHathHostname }
