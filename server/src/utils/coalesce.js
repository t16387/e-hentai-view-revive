const cache = require('../cache')

// requests for the same upstream resource that are already in flight
const inflight = new Map()

/**
 * Run fn once per key at a time: concurrent callers share the same promise
 * (a burst of identical API calls makes one upstream request).
 * @template T
 * @param {string} key
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>}
 */
function coalesce(key, fn) {
  const running = inflight.get(key)
  if (running) return running
  const p = Promise.resolve()
    .then(fn)
    .finally(() => inflight.delete(key))
  inflight.set(key, p)
  return p
}

/**
 * Cached + coalesced: a hit is served from the cache, a miss is fetched
 * once even when many requests arrive together. Errors are not cached.
 * @template T
 * @param {string} key
 * @param {number} ttl seconds
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>}
 */
async function cached(key, ttl, fn) {
  const hit = cache.get(key)
  if (hit !== undefined) return hit
  return coalesce(key, async () => {
    const value = await fn()
    cache.set(key, value, ttl)
    return value
  })
}

/** number of distinct requests in flight (tests) */
const inflightCount = () => inflight.size

module.exports = { coalesce, cached, inflightCount }
