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
const {
  isAllowedImageUrl,
  isSiteUrl,
  isImagePageUrl,
} = require('../utils/upstreamUrl')
const router = express.Router()

router.get('/', async (req, res) => {
  const page = parseInt(req.query.page || 0)
  const f_search = req.query.f_search || ''

  const cacheKey =
    `[g${req.cookies.ipb_member_id}]` +
    JSON.stringify({
      page,
      f_search,
      cookie: upstreamCookieString(req.cookies),
    })

  let content = cache.get(cacheKey)
  if (!content) {
    content = await galleryList(
      { page, f_search },
      upstreamCookieString(req.cookies)
    )

    cache.set(cacheKey, content, 180)
  }

  res.json(content)
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
  const { url } = req.query
  if (!isImagePageUrl(url)) {
    return res
      .status(400)
      .json({ error: true, message: 'invalid image page url' })
  }
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

router.get('/proxy', async (req, res) => {
  const url = req.query.url
  // only e-hentai/exhentai/ehgt/H@H image hosts: no open proxy / SSRF
  if (!isAllowedImageUrl(url)) {
    return res.status(400).send('url not allowed')
  }
  axios
    .get(url, {
      // site cookies go to the site only, never to third-party H@H hosts
      headers: isSiteUrl(url)
        ? { Cookie: upstreamCookieString(req.cookies) }
        : {},
      responseType: 'stream',
    })
    .then((response) => {
      PROXY_HEADERS.forEach((key) => {
        if (response.headers[key]) res.setHeader(key, response.headers[key])
      })
      res.setHeader('cache-control', 'max-age=31536000, public, immutable')
      response.data.pipe(res)
    })
    .catch((err) => {
      res.status(502).send(err.message)
    })
})
module.exports = router
