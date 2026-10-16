const express = require('express')
const path = require('path')
const fsp = require('fs').promises
const { upstreamCookieString } = require('../utils/cookies')
const {
  parseDownloadId,
  listDownloads,
  readMeta,
  publicMeta,
  removeDownload,
  clearAllDownloads,
  zipPath,
  findImageFile,
} = require('./downloadStore')
const { enqueueDownload, cancelDownload } = require('./downloadJob')

const router = express.Router()

const badRequest = (res, message = 'bad request') =>
  res.status(400).json({ error: true, message })

const isGalleryRef = (gid, token) =>
  /^\d{1,12}$/.test(gid) && /^[0-9a-f]{1,40}$/.test(token)

/**
 * Offline downloads are sensitive on LAN (Compose binds 0.0.0.0). Require the
 * same Sign-In session cookies the app sets as HttpOnly — CSRF alone is not
 * enough (the SPA always sends X-EHV-CSRF: 1). ipb_member_id alone is
 * spoofable; pass_hash comes only from a real login.
 */
function requireDownloadAuth(req, res, next) {
  const c = req.cookies || {}
  if (
    typeof c.ipb_member_id !== 'string' ||
    !c.ipb_member_id ||
    typeof c.ipb_pass_hash !== 'string' ||
    !c.ipb_pass_hash
  ) {
    return res.status(401).json({ error: true, message: 'No login' })
  }
  next()
}

router.use(requireDownloadAuth)

router.get('/', async (req, res) => {
  const list = await listDownloads()
  res.json({ error: false, list })
})

router.post('/', async (req, res) => {
  const gid = String((req.body && req.body.gid) || '')
  const token = String((req.body && req.body.token) || '')
  if (!isGalleryRef(gid, token)) return badRequest(res)
  const cookies = upstreamCookieString(req.cookies)
  const meta = await enqueueDownload({ gid, token, cookies })
  res.json({ error: false, download: meta })
})

router.delete('/', async (req, res) => {
  // cancel anything in flight first
  const list = await listDownloads()
  for (const item of list) cancelDownload(item.id)
  const removed = await clearAllDownloads()
  res.json({ error: false, removed })
})

router.get('/:id', async (req, res) => {
  const parsed = parseDownloadId(req.params.id)
  if (!parsed) return badRequest(res)
  const meta = await readMeta(parsed.id)
  if (!meta) return res.status(404).json({ error: true, message: 'not found' })
  res.json({ error: false, download: publicMeta(meta) })
})

router.delete('/:id', async (req, res) => {
  const parsed = parseDownloadId(req.params.id)
  if (!parsed) return badRequest(res)
  cancelDownload(parsed.id)
  const ok = await removeDownload(parsed.id)
  if (!ok) return res.status(404).json({ error: true, message: 'not found' })
  res.json({ error: false, removed: true })
})

router.get('/:id/zip', async (req, res) => {
  const parsed = parseDownloadId(req.params.id)
  if (!parsed) return badRequest(res)
  const meta = await readMeta(parsed.id)
  if (!meta || !meta.hasZip) {
    return res.status(404).json({ error: true, message: 'zip not ready' })
  }
  const zp = zipPath(parsed.id)
  try {
    await fsp.access(zp)
  } catch (e) {
    return res.status(404).json({ error: true, message: 'zip missing' })
  }
  const title =
    (meta.title_jpn || meta.title || parsed.id)
      .replace(/[\\/:*?"<>|]/g, '_')
      .slice(0, 120) || parsed.id
  res.download(zp, `${title}.zip`)
})

router.get('/:id/images/:index', async (req, res) => {
  const parsed = parseDownloadId(req.params.id)
  const index = parseInt(req.params.index, 10)
  if (!parsed || !Number.isFinite(index) || index < 0 || index > 9999) {
    return badRequest(res)
  }
  const fp = await findImageFile(parsed.id, index)
  if (!fp) return res.status(404).send('not found')
  res.setHeader('cache-control', 'max-age=31536000, public, immutable')
  res.sendFile(path.resolve(fp))
})

module.exports = router
