const { parseGalleryList } = require('./galleryParser')
const { UpstreamError } = require('../utils/fetchPage')

/**
 * Turn a fetched list page into the API payload. An empty result is only
 * returned for a real "no hits" page; a page without any gallery list
 * (blank, error, unknown layout) is an error instead of a silent [].
 */
function listFromDocument(document, mode) {
  const text = document.body ? document.body.textContent : ''
  if (/No hits found|No unfiltered results/i.test(text)) {
    return {
      list: [],
      total: 0,
      totalText: '',
      next: null,
      prev: null,
      displayMode: null,
    }
  }
  const { list, total, totalText, next, prev, displayMode } = parseGalleryList(
    document,
    mode
  )
  if (!displayMode) {
    throw new UpstreamError('parse', 'no gallery list found on the page')
  }
  return { list, total, totalText, next, prev, displayMode }
}

module.exports = { listFromDocument }
