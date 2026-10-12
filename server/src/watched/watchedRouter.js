const express = require('express')
const { upstreamCookieString, userCacheScope } = require('../utils/cookies')
const { getWatched } = require('./watchedApi')
const cache = require('../cache')
const { pickListParams, listCacheKey } = require('../gallery/listParams')
const router = express.Router()

router.get('/', async (req, res) => {
  const params = pickListParams(req.query)
  const site = (req.ehvSite && req.ehvSite.siteName) || 'e-hentai'
  const cacheKey = listCacheKey(
    `watched:${site}`,
    userCacheScope(req.cookies),
    params
  )
  let content = cache.get(cacheKey)
  if (!content) {
    content = await getWatched(params, upstreamCookieString(req.cookies))
    cache.set(cacheKey, content)
  }
  res.json({ error: false, ...content })
})

module.exports = router
