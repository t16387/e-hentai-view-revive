const fs = require('fs')
const fsp = require('fs').promises
const path = require('path')
const JSZip = require('jszip')
const axios = require('../axios')
const { CancelToken } = require('axios')
const {
  galleryDetail,
  galleryDetailPage,
  loadImg,
} = require('../gallery/galleryApi')
const {
  isAllowedImageUrl,
  isSiteUrl,
  canonicalUrl,
} = require('../utils/upstreamUrl')
const { assertPublicImageHost } = require('../utils/resolvePublic')
const {
  downloadId,
  readMeta,
  writeMeta,
  imagePath,
  zipPath,
  publicMeta,
} = require('./downloadStore')

const PROXY_TIMEOUT = Number(process.env.EHV_PROXY_TIMEOUT) || 10000
const CONCURRENCY = Math.max(
  1,
  Math.min(8, Number(process.env.EHV_DOWNLOAD_CONCURRENCY) || 3)
)
const MAX_PAGES = Math.max(
  1,
  Math.min(2000, Number(process.env.EHV_DOWNLOAD_MAX_PAGES) || 500)
)

/** in-memory queue: at most one gallery job runs at a time */
const queue = []
let running = false
const active = new Map() // id -> { cancel }

function extFromContentType(ct, url) {
  const t = (ct || '').toLowerCase()
  if (t.includes('png')) return 'png'
  if (t.includes('webp')) return 'webp'
  if (t.includes('gif')) return 'gif'
  if (t.includes('jpeg') || t.includes('jpg')) return 'jpg'
  try {
    const p = new URL(url).pathname
    const m = /\.(jpe?g|png|gif|webp)$/i.exec(p)
    if (m) return m[1].toLowerCase().replace('jpeg', 'jpg')
  } catch (e) {}
  return 'jpg'
}

async function fetchImageBuffer(url, cookies) {
  const target = canonicalUrl(url)
  if (!target || !isAllowedImageUrl(target)) {
    throw Object.assign(new Error('image url not allowed'), { code: 'EBADURL' })
  }
  await assertPublicImageHost(target)
  const response = await axios.get(target, {
    headers: isSiteUrl(target) ? { Cookie: cookies } : {},
    responseType: 'arraybuffer',
    timeout: PROXY_TIMEOUT,
    maxRedirects: 2,
    validateStatus: (s) => s >= 200 && s < 300,
  })
  const buf = Buffer.from(response.data)
  const ext = extFromContentType(
    response.headers && response.headers['content-type'],
    target
  )
  return { buf, ext }
}

async function collectPageUrls(gid, token, cookies, filecount) {
  const first = await galleryDetail({ gid, token }, cookies)
  const info = first.info || {}
  const total = Math.min(
    MAX_PAGES,
    parseInt(info.filecount || filecount || first.list.total || 0, 10) || 0
  )
  const perPage = first.list.perPage || 20
  const pageCount =
    first.list.pageCount || Math.max(1, Math.ceil(total / perPage))
  const urls = (first.list.list || []).map((o) => o.url)
  for (let p = 1; p < pageCount && urls.length < total; p++) {
    const page = await galleryDetailPage({ gid, token, p }, cookies)
    for (const item of page.list || []) {
      if (urls.length >= total) break
      urls.push(item.url)
    }
  }
  return {
    info,
    tagList: first.tagList || [],
    urls: urls.slice(0, total),
    total,
  }
}

async function mapPool(items, limit, worker) {
  const results = new Array(items.length)
  let next = 0
  async function run() {
    while (next < items.length) {
      const i = next++
      results[i] = await worker(items[i], i)
    }
  }
  const runners = []
  for (let i = 0; i < Math.min(limit, items.length); i++) runners.push(run())
  await Promise.all(runners)
  return results
}

async function buildZip(id, meta) {
  const zip = new JSZip()
  const files = meta.files || []
  for (let i = 0; i < files.length; i++) {
    const f = files[i]
    if (!f || !f.ext) continue
    const fp = imagePath(id, i, f.ext)
    if (!fp) continue
    try {
      const data = await fsp.readFile(fp)
      const name = `${String(i).padStart(4, '0')}.${f.ext}`
      zip.file(name, data)
    } catch (e) {
      /* skip missing */
    }
  }
  zip.file(
    'info.json',
    JSON.stringify(
      {
        gid: meta.gid,
        token: meta.token,
        title: meta.title,
        title_jpn: meta.title_jpn,
        category: meta.category,
        filecount: meta.filecount,
        tagList: meta.tagList || [],
      },
      null,
      2
    )
  )
  const out = zipPath(id)
  const content = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })
  await fsp.writeFile(out, content)
  return out
}

async function runJob(job) {
  const { gid, token, cookies } = job
  const id = downloadId(gid, token)
  const cancel = CancelToken.source()
  active.set(id, { cancel })

  let meta = await readMeta(id)
  if (!meta) {
    meta = {
      id,
      gid,
      token,
      status: 'running',
      done: 0,
      total: 0,
      files: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
  } else {
    meta.status = 'running'
    meta.error = null
    meta.updatedAt = Date.now()
  }
  await writeMeta(id, meta)

  try {
    const { info, tagList, urls, total } = await collectPageUrls(
      gid,
      token,
      cookies
    )
    meta.title = info.title || ''
    meta.title_jpn = info.title_jpn || info.title || ''
    meta.thumb = info.thumb || ''
    meta.category = info.category || ''
    meta.filecount = total
    meta.tagList = tagList
    meta.total = total
    meta.files = new Array(total).fill(null)
    meta.done = 0
    await writeMeta(id, meta)

    if (total === 0) {
      meta.status = 'error'
      meta.error = 'gallery has no images'
      meta.updatedAt = Date.now()
      await writeMeta(id, meta)
      return publicMeta(meta)
    }

    await mapPool(urls, CONCURRENCY, async (pageUrl, index) => {
      if (cancel.token.reason) throw new Error('cancelled')
      const existing = meta.files[index]
      if (existing && existing.ext) {
        meta.done = (meta.files || []).filter((f) => f && f.ext).length
        return
      }
      const resolved = await loadImg(pageUrl, cookies)
      if (!resolved || !resolved.url || !isAllowedImageUrl(resolved.url)) {
        throw new Error('unexpected image host')
      }
      const { buf, ext } = await fetchImageBuffer(resolved.url, cookies)
      const fp = imagePath(id, index, ext)
      await fsp.writeFile(fp, buf)
      meta.files[index] = { ext, size: buf.length }
      meta.done = meta.files.filter((f) => f && f.ext).length
      meta.updatedAt = Date.now()
      // persist progress periodically
      if (meta.done % 5 === 0 || meta.done === meta.total) {
        await writeMeta(id, meta)
      }
    })

    meta.done = meta.files.filter((f) => f && f.ext).length
    if (meta.done < meta.total) {
      meta.status = 'error'
      meta.error = `incomplete: ${meta.done}/${meta.total}`
    } else {
      await buildZip(id, meta)
      meta.hasZip = true
      meta.status = 'complete'
      meta.error = null
    }
    meta.updatedAt = Date.now()
    await writeMeta(id, meta)
    return publicMeta(meta)
  } catch (err) {
    meta = (await readMeta(id)) || meta
    meta.status = 'error'
    meta.error = (err && err.message) || 'download failed'
    meta.updatedAt = Date.now()
    await writeMeta(id, meta)
    return publicMeta(meta)
  } finally {
    active.delete(id)
  }
}

function pump() {
  if (running) return
  const next = queue.shift()
  if (!next) return
  running = true
  runJob(next)
    .catch((e) => console.error('[download]', e && e.message))
    .finally(() => {
      running = false
      pump()
    })
}

/**
 * Enqueue a gallery download. Returns public meta immediately.
 * @param {{ gid: string, token: string, cookies: string }} opts
 */
async function enqueueDownload({ gid, token, cookies }) {
  const id = downloadId(gid, token)
  let meta = await readMeta(id)
  if (meta && (meta.status === 'queued' || meta.status === 'running')) {
    return publicMeta(meta)
  }
  const now = Date.now()
  meta = {
    id,
    gid,
    token,
    title: (meta && meta.title) || '',
    title_jpn: (meta && meta.title_jpn) || '',
    thumb: (meta && meta.thumb) || '',
    category: (meta && meta.category) || '',
    filecount: (meta && meta.filecount) || 0,
    status: 'queued',
    done: 0,
    total: (meta && meta.total) || 0,
    files: [],
    hasZip: false,
    error: null,
    createdAt: (meta && meta.createdAt) || now,
    updatedAt: now,
  }
  await writeMeta(id, meta)
  queue.push({ gid, token, cookies })
  pump()
  return publicMeta(meta)
}

function cancelDownload(id) {
  const a = active.get(id)
  if (a && a.cancel) a.cancel.cancel('cancelled')
  // also drop from queue
  for (let i = queue.length - 1; i >= 0; i--) {
    if (downloadId(queue[i].gid, queue[i].token) === id) queue.splice(i, 1)
  }
}

module.exports = {
  enqueueDownload,
  cancelDownload,
  runJob,
  fetchImageBuffer,
  CONCURRENCY,
  MAX_PAGES,
}
