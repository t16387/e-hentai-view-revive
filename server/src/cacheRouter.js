const express = require('express')
const cache = require('./cache')
const router = express.Router()

/** Flush the in-memory NodeCache used by gallery/list/proxy lookups. */
router.post('/clear', async (req, res) => {
  const before = typeof cache.keys === 'function' ? cache.keys().length : 0
  cache.flushAll()
  res.json({ error: false, cleared: before, message: 'server cache cleared' })
})

router.get('/stats', async (req, res) => {
  const keys = typeof cache.keys === 'function' ? cache.keys().length : 0
  const stats = typeof cache.getStats === 'function' ? cache.getStats() : {}
  res.json({ error: false, keys, stats })
})

module.exports = router
