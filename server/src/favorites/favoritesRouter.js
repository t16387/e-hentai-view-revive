const express = require('express')
const { upstreamCookieString, userCacheScope } = require('../utils/cookies')
const {
  getFavorites,
  getFavoritesInfo,
  updateFavorite,
} = require('./favoritesApi')
const cache = require('../cache')
const { cached } = require('../utils/coalesce')
const { detailKey, favoritesInfoKey } = require('../utils/cacheKeys')
const { pickListParams, listCacheKey } = require('../gallery/listParams')
const router = express.Router()

router.get('/', async (req, res) => {
  const params = pickListParams(req.query, {
    favcat: (v) => v === 'all' || /^\d$/.test(v),
  })
  if (!params.favcat) params.favcat = 'all'
  const site = (req.ehvSite && req.ehvSite.siteName) || 'e-hentai'
  const cacheKey = listCacheKey(
    `favorites:${site}`,
    userCacheScope(req.cookies),
    params
  )
  let content = cache.get(cacheKey)
  if (!content) {
    content = await getFavorites(params, upstreamCookieString(req.cookies))
    cache.set(cacheKey, content)
  }
  res.json({ error: false, ...content })
})

router.get('/info', async (req, res) => {
  // FavIconButton is mounted twice per gallery view (toolbar + menu)
  const list = await cached(
    favoritesInfoKey(
      userCacheScope(req.cookies),
      (req.ehvSite && req.ehvSite.siteName) || 'e-hentai'
    ),
    60,
    () => getFavoritesInfo(upstreamCookieString(req.cookies))
  )
  res.json({ error: false, list })
})

const isGalleryRef = (gid, token) =>
  /^\d{1,12}$/.test(gid) && /^[0-9a-f]{1,40}$/.test(token)

router.put('/add/:gid/:token', async (req, res) => {
  const { gid, token } = req.params
  if (!isGalleryRef(gid, token)) {
    return res.status(400).json({ error: true, message: 'bad request' })
  }
  const favcat = req.query && req.query.favcat
  if (
    favcat !== undefined &&
    favcat !== null &&
    favcat !== '' &&
    !(favcat === 'all' || /^\d$/.test(String(favcat)))
  ) {
    return res.status(400).json({ error: true, message: 'bad request' })
  }
  await updateFavorite(
    { gid, token, favcat },
    upstreamCookieString(req.cookies)
  )
  const scope = userCacheScope(req.cookies)
  cache.del([
    favoritesInfoKey(
      scope,
      (req.ehvSite && req.ehvSite.siteName) || 'e-hentai'
    ),
    detailKey(
      scope,
      gid,
      token,
      (req.ehvSite && req.ehvSite.siteName) || 'e-hentai'
    ),
  ])
  res.json({ error: false, message: 'success' })
})

module.exports = router
