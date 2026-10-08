const axios = require('../axios')
const { baseApiURL, baseURL, gallerytorrentsURL } = require('../config/api')
const {
  parseGalleryList,
  // parseHTMLAnchorElement,
  parseDetailPageCommentList,
  parseDetailPageList,
  parseDetailPageTagList,
  parseBigImg,
  parseDetailPageInfo,
  parseTorrentList,
  isContentWarning,
} = require('./galleryParser')
const JSDOM = require('jsdom').JSDOM
const dayjs = require('dayjs')
const filesize = require('filesize')
const translated = require('../utils/translated')
const { chunk } = require('lodash')
const { GalleryMode } = require('../constant')
async function gdata(gidlist, cookies) {
  if (gidlist.length === 0) return []
  const taskList = []
  chunk(gidlist, 25).forEach((gidlist) =>
    taskList.push(
      axios.post(
        baseApiURL,
        {
          method: 'gdata',
          gidlist,
        },
        {
          headers: {
            Cookie: cookies,
          },
        }
      )
    )
  )

  const res = (await Promise.all(taskList))
    .map((res) => {
      res.data.gmetadata.forEach((o) => {
        if (o.error)
          throw new Error('[404]Key missing, or incorrect key provided.')
        o.time = dayjs(+o.posted * 1000).format('YYYY-MM-DD HH:mm')
        o.title_jpn = o.title_jpn || o.title
        o.category = o.category.replace(/\s/, '_')
        o.filesize = filesize(+o.filesize)
        o.url = `${baseURL}/g/${o.gid}/${o.token}`
        o.path = `/${o.gid}/${o.token}`
        o.torrents.forEach((v) => {
          v.fsize = filesize(v.fsize)
          v.tsize = filesize(v.tsize)
          v.added = dayjs(+v.added * 1000).format('YYYY-MM-DD HH:mm')
        })
      })
      return res.data.gmetadata
    })
    .reduce((prev, next) => [...prev, ...next], [])

  return res
}

/**
 * @param {Record<string,string>} params validated list params (listParams.js)
 * @param {string} cookies
 * @returns {Promise<{list: any[], total: number, totalText: string, next: string|null, prev: string|null}>}
 */
async function galleryList(params, cookies) {
  // no inline_set: the parser detects the display mode itself
  const res = await axios.get(`${baseURL}/`, {
    headers: {
      Cookie: cookies,
    },
    params,
  })
  const document = new JSDOM(res.data).window.document
  if (document.body.innerHTML === '') {
    throw new Error('[sad panda] no login!')
  }

  const empty = { list: [], total: 0, totalText: '', next: null, prev: null }
  if (document.body.innerHTML.includes('No hits found')) {
    return empty
  }

  const { list, total, totalText, next, prev } = parseGalleryList(
    document,
    GalleryMode.FrontPage
  )
  if (list.length === 0) console.error('[gallery] list page parsed 0 rows')
  return { list, total, totalText, next, prev }
}

async function galleryDetail({ gid, token }, cookies) {
  let list = { list: [], total: 0 }
  let commentList = []
  let tagList = []
  let info = {}

  // no inline_set=ts_l: thumbnails-per-page is read from the page, and every
  // ?p=N request then uses the same account setting as page 0
  const res = await axios.get(`${baseURL}/g/${gid}/${token}/`, {
    headers: { Cookie: cookies },
  })
  const document = new JSDOM(res.data).window.document
  if (document.body.textContent === 'Key missing, or incorrect key provided.')
    throw new Error('[404]Key missing, or incorrect key provided.')
  if (isContentWarning(document))
    throw new Error('[warning] content warning page was not skipped')
  list = parseDetailPageList(document)
  commentList = parseDetailPageCommentList(document)
  tagList = parseDetailPageTagList(document)
  info = parseDetailPageInfo(document, res.data)
  // tagList = translated(tagList)

  return { list, commentList, tagList, info }
}
async function galleryDetailPage({ gid, token, p }, cookies) {
  const res = await axios.get(`${baseURL}/g/${gid}/${token}/`, {
    params: { p },
    headers: { Cookie: cookies },
  })
  const document = new JSDOM(res.data).window.document
  if (isContentWarning(document))
    throw new Error('[warning] content warning page was not skipped')
  return parseDetailPageList(document)
}
async function loadImg(url, cookies) {
  let count = 0
  async function load() {
    try {
      const res = await axios.get(url, { headers: { Cookie: cookies } })
      const document = new JSDOM(res.data).window.document
      return parseBigImg(document)
    } catch (error) {
      // quota / layout errors will not fix themselves: fail fast
      if (/^\[(509|image)\]/.test(error.message)) throw error
      if (count++ >= 2) throw error
      await new Promise((r) => setTimeout(r, 300 * count))
      return await load()
    }
  }
  return await load()
}

async function gallerytorrentsList({ gid, token }, cookies) {
  const res = await axios.get(`${gallerytorrentsURL}?gid=${gid}&t=${token}`, {
    headers: { Cookie: cookies },
  })
  const document = new JSDOM(res.data).window.document

  return parseTorrentList(document)
}

module.exports = {
  gdata,
  galleryList,
  galleryDetail,
  loadImg,
  galleryDetailPage,
  gallerytorrentsList,
}
