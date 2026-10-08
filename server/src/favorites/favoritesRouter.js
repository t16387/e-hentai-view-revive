const express = require('express')
const { upstreamCookieString } = require('../utils/cookies')
const {
  getFavorites,
  getFavoritesInfo,
  updateFavorite,
} = require('./favoritesApi')
const cache = require('../cache')
const { pickListParams, listCacheKey } = require('../gallery/listParams')
const router = express.Router()

router.get('/', async (req, res) => {
  const params = pickListParams(req.query, {
    favcat: (v) => v === 'all' || /^\d$/.test(v),
  })
  if (!params.favcat) params.favcat = 'all'
  const cacheKey = listCacheKey('favorites', req.cookies.ipb_member_id, params)
  let content = cache.get(cacheKey)
  if (!content) {
    content = await getFavorites(params, upstreamCookieString(req.cookies))
    cache.set(cacheKey, content)
  }
  res.json({ error: false, ...content })
})

router.get('/info', async (req, res) => {
  const list = await getFavoritesInfo(upstreamCookieString(req.cookies))
  res.json({ error: false, list })
})

router.put('/add/:gid/:token', async (req, res) => {
  const { gid, token } = req.params
  const { favcat } = req.query
  await updateFavorite(
    { gid, token, favcat },
    upstreamCookieString(req.cookies)
  )
  res.json({ error: false, message: 'success' })
})

module.exports = router
