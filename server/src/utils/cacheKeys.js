/** cache keys shared by routers (per user: scope = hash of login cookies) */
const detailKey = (scope, gid, token, site = '') =>
  `[g${scope}]${site ? ' ' + site : ''} detail ${gid}/${token}`
const favoritesInfoKey = (scope, site = '') =>
  `[g${scope}]${site ? ' ' + site : ''} favorites-info`
const torrentKey = (scope, gid, token, site = '') =>
  `[g${scope}]${site ? ' ' + site : ''} torrent ${gid}/${token}`
module.exports = { detailKey, favoritesInfoKey, torrentKey }
