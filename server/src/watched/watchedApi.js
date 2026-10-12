const { getSite } = require('../config/api')
const { fetchPage } = require('../utils/fetchPage')
const { listFromDocument } = require('../gallery/listPage')
const { GalleryMode } = require('../constant')
async function getWatched(params, cookies) {
  const { watchedURL, siteName } = getSite()
  const { document } = await fetchPage(watchedURL, {
    cookies,
    params,
    siteName,
  })
  return listFromDocument(document, GalleryMode.Watched)
}

module.exports = { getWatched }
