const { popularURL, siteName } = require('../config/api')
const { fetchPage } = require('../utils/fetchPage')
const { listFromDocument } = require('../gallery/listPage')
const { GalleryMode } = require('../constant')
async function getPopular(cookies) {
  const { document } = await fetchPage(popularURL, { cookies, siteName })
  return listFromDocument(document, GalleryMode.Popular).list
}

module.exports = { getPopular }
