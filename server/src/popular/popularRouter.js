const express = require('express')
const { upstreamCookieString, userCacheScope } = require('../utils/cookies')
const { getPopular } = require('./popluarApi')
const cache = require('../cache')
const router = express.Router()

router.get('/', async (req, res) => {
  const site = (req.ehvSite && req.ehvSite.siteName) || 'e-hentai'
  const cacheKey = `[g${userCacheScope(req.cookies)}] ${site} popular`
  let content = cache.get(cacheKey)
  if (!content) {
    content = await getPopular(upstreamCookieString(req.cookies))
    cache.set(cacheKey, content)
  }
  res.json({ error: false, list: content })
})

module.exports = router
