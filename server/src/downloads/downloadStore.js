const fs = require('fs')
const fsp = require('fs').promises
const path = require('path')

const DEFAULT_ROOT = path.join(process.cwd(), 'data', 'downloads')

function downloadsRoot() {
  return process.env.EHV_DOWNLOADS_DIR
    ? path.resolve(process.env.EHV_DOWNLOADS_DIR)
    : DEFAULT_ROOT
}

/** gid_token id from validated gallery refs */
function downloadId(gid, token) {
  return `${gid}_${token}`
}

const ID_RE = /^(\d{1,12})_([0-9a-f]{1,40})$/

function parseDownloadId(id) {
  if (typeof id !== 'string') return null
  const m = ID_RE.exec(id)
  if (!m) return null
  return { gid: m[1], token: m[2], id }
}

function downloadDir(id) {
  const parsed = parseDownloadId(id)
  if (!parsed) return null
  const root = downloadsRoot()
  const dir = path.join(root, parsed.id)
  // refuse anything outside the root
  if (!dir.startsWith(root + path.sep) && dir !== root) return null
  return dir
}

async function ensureRoot() {
  await fsp.mkdir(downloadsRoot(), { recursive: true })
}

async function readMeta(id) {
  const dir = downloadDir(id)
  if (!dir) return null
  try {
    const raw = await fsp.readFile(path.join(dir, 'meta.json'), 'utf8')
    return JSON.parse(raw)
  } catch (e) {
    if (e && e.code === 'ENOENT') return null
    throw e
  }
}

async function writeMeta(id, meta) {
  const dir = downloadDir(id)
  if (!dir) throw new Error('invalid download id')
  await fsp.mkdir(dir, { recursive: true })
  await fsp.mkdir(path.join(dir, 'images'), { recursive: true })
  const tmp = path.join(dir, 'meta.json.tmp')
  await fsp.writeFile(tmp, JSON.stringify(meta, null, 2), 'utf8')
  await fsp.rename(tmp, path.join(dir, 'meta.json'))
  return meta
}

async function listDownloads() {
  await ensureRoot()
  const root = downloadsRoot()
  let names
  try {
    names = await fsp.readdir(root)
  } catch (e) {
    if (e && e.code === 'ENOENT') return []
    throw e
  }
  const out = []
  for (const name of names) {
    if (!parseDownloadId(name)) continue
    const meta = await readMeta(name)
    if (meta) {
      const pub = publicMeta(meta)
      delete pub.files
      out.push(pub)
    }
  }
  out.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
  return out
}

function publicMeta(meta) {
  if (!meta) return null
  return {
    id: meta.id,
    gid: meta.gid,
    token: meta.token,
    title: meta.title || '',
    title_jpn: meta.title_jpn || '',
    thumb: meta.thumb || '',
    category: meta.category || '',
    filecount: meta.filecount || 0,
    status: meta.status,
    done: meta.done || 0,
    total: meta.total || 0,
    error: meta.error || null,
    createdAt: meta.createdAt,
    updatedAt: meta.updatedAt,
    hasZip: !!meta.hasZip,
    files: Array.isArray(meta.files) ? meta.files : undefined,
  }
}

async function removeDownload(id) {
  const dir = downloadDir(id)
  if (!dir) return false
  try {
    await fsp.rm(dir, { recursive: true, force: true })
    return true
  } catch (e) {
    if (e && e.code === 'ENOENT') return false
    throw e
  }
}

async function clearAllDownloads() {
  await ensureRoot()
  const root = downloadsRoot()
  const names = await fsp.readdir(root)
  let removed = 0
  for (const name of names) {
    if (!parseDownloadId(name)) continue
    await fsp.rm(path.join(root, name), { recursive: true, force: true })
    removed++
  }
  return removed
}

function imagePath(id, index, ext) {
  const dir = downloadDir(id)
  if (!dir) return null
  const n = String(index).padStart(4, '0')
  const safeExt = String(ext || 'jpg').replace(/[^a-z0-9]/gi, '') || 'jpg'
  return path.join(dir, 'images', `${n}.${safeExt}`)
}

function zipPath(id) {
  const dir = downloadDir(id)
  if (!dir) return null
  return path.join(dir, 'gallery.zip')
}

/** resolve an existing image file for index (any known ext) */
async function findImageFile(id, index) {
  const dir = downloadDir(id)
  if (!dir) return null
  const n = String(index).padStart(4, '0')
  const imagesDir = path.join(dir, 'images')
  let entries
  try {
    entries = await fsp.readdir(imagesDir)
  } catch (e) {
    return null
  }
  const hit = entries.find((f) => f.startsWith(n + '.'))
  return hit ? path.join(imagesDir, hit) : null
}

module.exports = {
  downloadsRoot,
  downloadId,
  parseDownloadId,
  downloadDir,
  ensureRoot,
  readMeta,
  writeMeta,
  listDownloads,
  publicMeta,
  removeDownload,
  clearAllDownloads,
  imagePath,
  zipPath,
  findImageFile,
  ID_RE,
}
