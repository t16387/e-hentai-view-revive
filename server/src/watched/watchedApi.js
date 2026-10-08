const axios = require('../axios')
const { watchedURL } = require('../config/api')
const JSDOM = require('jsdom').JSDOM
const { parseGalleryList } = require('../gallery/galleryParser')
const { GalleryMode } = require('../constant')
async function getWatched(params, cookies) {
  const res = await axios.get(`${watchedURL}`, {
    params,
    headers: { Cookie: cookies },
  })

  const document = new JSDOM(res.data).window.document

  if (document.body.innerHTML.includes('No hits found')) {
    return { list: [], total: 0, next: null, prev: null }
  }

  const { list, total, next, prev } = parseGalleryList(
    document,
    GalleryMode.Watched
  )
  return { list, total, next, prev }
}

module.exports = { getWatched }
