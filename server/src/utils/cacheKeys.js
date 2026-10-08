/** cache keys shared by routers (per user: scope = hash of login cookies) */
const detailKey = (scope, gid, token) => `[g${scope}] detail ${gid}/${token}`
const favoritesInfoKey = (scope) => `[g${scope}] favorites-info`
const torrentKey = (scope, gid, token) => `[g${scope}] torrent ${gid}/${token}`
module.exports = { detailKey, favoritesInfoKey, torrentKey }
