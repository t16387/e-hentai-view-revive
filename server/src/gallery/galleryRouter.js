const express = require('express')
const axios = require('../axios')
const {
  galleryList,
  galleryDetail,
  loadImg,
  galleryDetailPage,
  gallerytorrentsList,
} = require('./galleryApi')
const { upstreamCookieString } = require('../utils/cookies')
const cache = require('../cache')
const { pickListParams, listCacheKey } = require('./listParams')
const {
  isAllowedImageUrl,
  isSiteUrl,
  isImagePageUrl,
  canonicalUrl,
} = require('../utils/upstreamUrl')
const router = express.Router()

router.get('/', async (req, res) => {
  const params = pickListParams(req.query)
  const cacheKey = listCacheKey('gallery', req.cookies.ipb_member_id, params)

  let content = cache.get(cacheKey)
  if (!content) {
    content = await galleryList(params, upstreamCookieString(req.cookies))
    cache.set(cacheKey, content, 180)
  }

  res.json({ error: false, ...content })
})

// thumbnail pages depend on the account's thumbnail setting: cache per user
const pageCacheKey = (req, gid, token, p) =>
  `[g${req.cookies.ipb_member_id}]/${gid}/${token}/${p}`

/** list + paging metadata of one thumbnail page */
const pagePayload = (page) => ({
  list: page.list,
  total: page.total,
  perPage: page.perPage,
  pageCount: page.pageCount,
  page: page.page,
})

router.get('/:gid/:token', async (req, res) => {
  const { gid, token } = req.params

  const content = await galleryDetail(
    { gid, token },
    upstreamCookieString(req.cookies)
  )

  // 为read页面缓存下数据 (cache thumbnail page 0 for the reader)
  cache.set(pageCacheKey(req, gid, token, 0), content.list)
  const { list, ...thumbPages } = pagePayload(content.list)

  res.json({ ...content, list, thumbPages })
})
router.get('/:gid/:token/torrent', async (req, res) => {
  const { gid, token } = req.params

  const content = await gallerytorrentsList(
    { gid, token },
    upstreamCookieString(req.cookies)
  )

  res.json({ error: false, list: content })
})
router.get('/:gid/:token/:p', async (req, res) => {
  const { gid, token } = req.params
  const p = parseInt(req.params.p, 10)
  if (!/^\d+$/.test(gid) || !/^[0-9a-f]+$/.test(token) || !(p >= 0)) {
    return res.status(400).json({ error: true, message: 'bad request' })
  }
  const cacheKey = pageCacheKey(req, gid, token, p)

  let content = cache.get(cacheKey)

  if (!content) {
    content = await galleryDetailPage(
      { gid, token, p },
      upstreamCookieString(req.cookies)
    )
    cache.set(cacheKey, content)
  }

  res.json({ error: false, ...pagePayload(content) })
})

router.get('/loadImg', async (req, res) => {
  if (!isImagePageUrl(req.query.url)) {
    return res
      .status(400)
      .json({ error: true, message: 'invalid image page url' })
  }
  // fetch exactly the URL that was checked
  const url = canonicalUrl(req.query.url)
  let content = cache.get(url)
  if (!content) {
    try {
      content = await loadImg(url, upstreamCookieString(req.cookies))
      cache.set(url, content, 120)
    } catch (error) {
      return res.json({ error: true, message: error.message })
    }
  }

  res.json({ error: false, url: content.url, retryURL: content.retryURL })
})

// headers worth passing through from the image host
const PROXY_HEADERS = [
  'content-type',
  'content-length',
  'last-modified',
  'etag',
  'accept-ranges',
]

// H@H nodes often listen on high ports; an unreachable node must fail fast
// so the reader's error handler can ask for another server (nl= retry)
// instead of the request hanging until the browser gives up.
const PROXY_TIMEOUT = Number(process.env.EHV_PROXY_TIMEOUT) || 20000

// redirects are followed by hand so that every hop is checked against the
// allowlist (axios would follow them to any host, e.g. an internal address)
const PROXY_MAX_REDIRECTS = 2

/** next hop of an image redirect, or null when it leaves the allowlist */
function redirectTarget(location, from) {
  if (!location) return null
  let next
  try {
    next = new URL(location, from).href
  } catch (e) {
    return null
  }
  return isAllowedImageUrl(next) ? canonicalUrl(next) : null
}

/** GET an image, following at most PROXY_MAX_REDIRECTS allowlisted redirects */
async function fetchImage(url, req) {
  let target = url
  for (let hop = 0; ; hop++) {
    const response = await axios.get(target, {
      // site cookies go to the site only, never to third-party H@H hosts
      headers: isSiteUrl(target)
        ? { Cookie: upstreamCookieString(req.cookies) }
        : {},
      responseType: 'stream',
      timeout: PROXY_TIMEOUT,
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400,
    })
    const status = response.status || 200
    if (status < 300) return response
    if (response.data && response.data.destroy) response.data.destroy()
    const next =
      hop < PROXY_MAX_REDIRECTS &&
      redirectTarget(response.headers && response.headers.location, target)
    if (!next) {
      throw Object.assign(new Error('image host redirect refused'), {
        code: 'EREDIRECT',
      })
    }
    target = next
  }
}

router.get('/proxy', async (req, res) => {
  // only e-hentai/exhentai/ehgt/H@H image hosts: no open proxy / SSRF
  if (!isAllowedImageUrl(req.query.url)) {
    return res.status(400).send('url not allowed')
  }
  // fetch exactly the URL that was checked
  const url = canonicalUrl(req.query.url)
  let upstream
  req.on('close', () => {
    if (upstream && !res.writableFinished) upstream.destroy()
  })
  fetchImage(url, req)
    .then((response) => {
      upstream = response.data
      PROXY_HEADERS.forEach((key) => {
        if (response.headers[key]) res.setHeader(key, response.headers[key])
      })
      res.setHeader('cache-control', 'max-age=31536000, public, immutable')
      upstream.on('error', () => res.destroy())
      upstream.pipe(res)
    })
    .catch((err) => {
      if (res.headersSent) return res.destroy()
      const timedOut = err && err.code === 'ECONNABORTED'
      res
        .status(timedOut ? 504 : 502)
        .send(timedOut ? 'image host timed out' : 'image host error')
    })
})
module.exports = router
