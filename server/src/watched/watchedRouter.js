const express = require('express')
const { upstreamCookieString, userCacheScope } = require('../utils/cookies')
const { getWatched } = require('./watchedApi')
const cache = require('../cache')
const { pickListParams, listCacheKey } = require('../gallery/listParams')
const router = express.Router()

router.get('/', async (req, res) => {
  const params = pickListParams(req.query)
  const cacheKey = listCacheKey('watched', userCacheScope(req.cookies), params)
  let content = cache.get(cacheKey)
  if (!content) {
    content = await getWatched(params, upstreamCookieString(req.cookies))
    cache.set(cacheKey, content)
  }
  res.json({ error: false, ...content })
})

module.exports = router
