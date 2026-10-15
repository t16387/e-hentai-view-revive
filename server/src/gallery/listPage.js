const {
  parseGalleryList,
  parseCursors,
  parseSearchText,
} = require('./galleryParser')
const { UpstreamError } = require('../utils/fetchPage')

/**
 * Turn a fetched list page into the API payload.
 *
 * True "no hits" (search matched nothing) → empty list, next/prev null.
 * A page where every gallery was excluded/filtered but EH still offers
 * Next/Prev must keep those cursors — otherwise jump/next stop early
 * while the UI still shows EH's approximate page total (e.g. 13/36).
 */
function listFromDocument(document, mode) {
  const text = document.body ? document.body.textContent : ''
  const noHits = /No hits found/i.test(text)
  const noUnfiltered = /No unfiltered results/i.test(text)
  const { next, prev } = parseCursors(document)
  const hasCursor = !!(next || prev)

  // Terminal empty only when the search truly matched nothing (no hits)
  // and there is no further cursor. "No unfiltered results" alone can
  // appear on a mid-chain page where filters emptied the current GID
  // range but Next still leads to more galleries.
  if (noHits && !hasCursor) {
    const { total, totalText } = parseSearchText(document)
    return {
      list: [],
      total: total || 0,
      totalText: totalText || '',
      next: null,
      prev: null,
      displayMode: null,
    }
  }

  const {
    list,
    total,
    totalText,
    next: n2,
    prev: p2,
    displayMode,
  } = parseGalleryList(document, mode)

  if (!displayMode) {
    // Filtered-empty pages may lack gallery rows but still have itg + nav.
    // If we have cursors (or an explicit unfiltered-empty banner), return
    // an empty page that preserves pagination instead of throwing.
    if (hasCursor || noUnfiltered) {
      const { total: t, totalText: tt } = parseSearchText(document)
      return {
        list: [],
        total: t || 0,
        totalText: tt || '',
        next,
        prev,
        displayMode: null,
      }
    }
    throw new UpstreamError('parse', 'no gallery list found on the page')
  }

  return {
    list,
    total,
    totalText,
    next: n2,
    prev: p2,
    displayMode,
  }
}

module.exports = { listFromDocument }
