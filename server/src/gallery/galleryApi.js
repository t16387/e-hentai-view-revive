const axios = require('../axios')
const { getSite } = require('../config/api')
const {
  // parseHTMLAnchorElement,
  parseDetailPageCommentList,
  parseDetailPageList,
  parseDetailPageTagList,
  parseBigImg,
  parseDetailPageInfo,
  parseTorrentList,
  isContentWarning,
} = require('./galleryParser')
const dayjs = require('dayjs')
const filesize = require('filesize')
const translated = require('../utils/translated')
const { chunk } = require('lodash')
const { GalleryMode } = require('../constant')
const { fetchPage } = require('../utils/fetchPage')
const { listFromDocument } = require('./listPage')
async function gdata(gidlist, cookies) {
  if (gidlist.length === 0) return []
  const { baseApiURL, baseURL } = getSite()
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
  const { baseURL, siteName } = getSite()
  // no inline_set: the parser detects the display mode itself
  const { document } = await fetchPage(`${baseURL}/`, {
    cookies,
    params,
    siteName,
  })
  return listFromDocument(document, GalleryMode.FrontPage)
}

async function galleryDetail({ gid, token }, cookies) {
  const { baseURL, siteName } = getSite()
  let list = { list: [], total: 0 }
  let commentList = []
  let tagList = []
  let info = {}

  // no inline_set=ts_l: thumbnails-per-page is read from the page, and every
  // ?p=N request then uses the same account setting as page 0
  const { document, html } = await fetchPage(`${baseURL}/g/${gid}/${token}/`, {
    cookies,
    siteName,
  })
  if (isContentWarning(document))
    throw new Error('[warning] content warning page was not skipped')
  list = parseDetailPageList(document)
  commentList = parseDetailPageCommentList(document)
  tagList = parseDetailPageTagList(document)
  info = parseDetailPageInfo(document, html)
  // tagList = translated(tagList)

  return { list, commentList, tagList, info }
}
async function galleryDetailPage({ gid, token, p }, cookies) {
  const { baseURL, siteName } = getSite()
  const { document } = await fetchPage(`${baseURL}/g/${gid}/${token}/`, {
    cookies,
    params: { p },
    siteName,
  })
  if (isContentWarning(document))
    throw new Error('[warning] content warning page was not skipped')
  return parseDetailPageList(document)
}
async function loadImg(url, cookies) {
  const { siteName } = getSite()
  let count = 0
  async function load() {
    try {
      const { document } = await fetchPage(url, { cookies, siteName })
      return parseBigImg(document)
    } catch (error) {
      // quota / login / layout errors will not fix themselves: fail fast
      if (error.code || /^\[(509|image)\]/.test(error.message)) throw error
      if (count++ >= 2) throw error
      await new Promise((r) => setTimeout(r, 300 * count))
      return await load()
    }
  }
  return await load()
}

async function gallerytorrentsList({ gid, token }, cookies) {
  const { gallerytorrentsURL, siteName } = getSite()
  const { document } = await fetchPage(gallerytorrentsURL, {
    cookies,
    params: { gid, t: token },
    siteName,
  })

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
