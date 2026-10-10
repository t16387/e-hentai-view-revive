const { uniq } = require('lodash')
const dayjs = require('dayjs')
const { GalleryMode } = require('../constant')
const { baseURL } = require('../config/api')
const { sanitizeCommentHtml } = require('../utils/sanitizeHtml')

/**
 * Parse the "Found about 12,345 results." banner (div.searchtext).
 * The old `p.ip` element no longer exists. Returns null when absent or
 * not numeric ("Found hundreds of results").
 * @param {Document} document
 * @returns {{ total: number|null, totalText: string }}
 */
function parseSearchText(document) {
  const el = document.querySelector('.searchtext p, .searchtext, p.ip')
  const totalText = el ? el.textContent.replace(/\s+/g, ' ').trim() : ''
  const m = totalText.match(/(\d[\d,]*)/)
  const total = m ? parseInt(m[1].replace(/,/g, ''), 10) : null
  return { total, totalText }
}

/**
 * Cursor pagination: the site ignores `page=N` and links to the next/previous
 * page with `next=<gid>` / `prev=<gid>` (favorites: `<gid>-<favtime>`).
 * @param {Document} document
 * @returns {{ next: string|null, prev: string|null }}
 */
function parseCursors(document) {
  const pick = (ids, param) => {
    for (const id of ids) {
      const a = document.getElementById(id)
      const href = a && a.getAttribute('href')
      if (!href) continue
      const m = href.match(new RegExp('[?&]' + param + '=([\\d-]+)'))
      if (m) return m[1]
    }
    return null
  }
  return {
    next: pick(['unext', 'dnext'], 'next'),
    prev: pick(['uprev', 'dprev'], 'prev'),
  }
}

/**
 * Display mode of a list page, detected from the markup instead of forcing
 * it with inline_set (which redirects and, for logged-in users, rewrites
 * their account setting).
 * @param {Document} document
 */
function detectListMode(document) {
  if (document.querySelector('div.itg.gld')) return 'thumbnail'
  const table = document.querySelector('table.itg')
  if (!table) return null
  if (table.classList.contains('gltm')) return 'minimal'
  if (table.classList.contains('glte')) return 'extended'
  return 'compact'
}

/** the gallery items of a list page, whatever the display mode */
function listItems(document, mode) {
  if (mode === 'thumbnail')
    return Array.from(document.querySelectorAll('div.itg.gld > .gl1t'))
  // skip the <th> header row and single-cell ad / notice rows
  return Array.from(document.querySelectorAll('table.itg > tbody > tr')).filter(
    (tr) => !tr.querySelector('th') && tr.children.length > 1
  )
}

/** first element whose own text looks like "N pages" */
function _parseFilecount(item) {
  const el = Array.from(item.querySelectorAll('div')).find((div) =>
    /^\d+ pages?$/.test(div.textContent.trim())
  )
  return el ? parseInt(el.textContent, 10) : 0
}

/**
 * @param {Element} item
 * @param {int} mode GalleryMode
 */
function _parseListItem(item, mode) {
  const link =
    item.querySelector('.glink') &&
    item.querySelector('.glink').closest('a[href*="/g/"]')
  const a = link || item.querySelector('a[href*="/g/"]')
  if (!a) return null
  const url = a.getAttribute('href')
  const [gid, token] = _parseUrl(new URL(url, 'https://e-hentai.org').pathname)
  if (!/^\d+$/.test(gid)) return null

  const titleEl = item.querySelector('.glink')
  const categoryEl = item.querySelector('.cn, .cs')
  const postedEl = item.querySelector('[id^=posted_]')
  const ratingEl = item.querySelector('.ir')
  const uploaderEl = item.querySelector('a[href*="/uploader/"]')
  const imgEl = item.querySelector('.glthumb img, .gl1e img, .gl3t img, img')

  const tags = Array.from(item.querySelectorAll('.gt[title], .gtl[title]')).map(
    (tagEl) => {
      const full = tagEl.getAttribute('title')
      const i = full.indexOf(':')
      return {
        watched: tagEl.hasAttribute('style'),
        title: tagEl.textContent,
        namespace: i === -1 ? 'misc' : full.slice(0, i),
        tagName: i === -1 ? full : full.slice(i + 1),
      }
    }
  )

  return {
    gid,
    token,
    posted: postedEl
      ? dayjs(postedEl.textContent.trim() + 'Z', { utc: true }).valueOf()
      : 0,
    title: titleEl ? titleEl.textContent : '',
    category: categoryEl ? categoryEl.textContent : '',
    rating: ratingEl ? _parseRating(ratingEl.getAttribute('style')) : 0,
    uploader:
      mode === GalleryMode.Favorites || !uploaderEl
        ? ''
        : uploaderEl.textContent,
    filecount: _parseFilecount(item),
    thumb: imgEl
      ? imgEl.getAttribute('data-src') || imgEl.getAttribute('src') || ''
      : '',
    tags,
  }
}

/**
 * List pages: front page / search, watched, popular, favorites.
 * Never throws because of a missing count or an odd row.
 * @param {Document} document
 * @param {int} mode GalleryMode
 */
function parseGalleryList(document, mode) {
  const displayMode = detectListMode(document)
  const res = []
  if (displayMode) {
    listItems(document, displayMode).forEach((item) => {
      try {
        const parsed = _parseListItem(item, mode)
        if (parsed) res.push(parsed)
      } catch (e) {
        console.error(e)
      }
    })
  }

  const { total, totalText } = parseSearchText(document)
  const { next, prev } = parseCursors(document)
  return {
    list: res,
    total: mode === GalleryMode.Popular ? res.length : total || 0,
    totalText,
    next,
    prev,
    displayMode,
  }
}

/**
 * @param {string} style
 * @return {number}
 */
function _parseRating(style) {
  let rating = 5.0
  const re = RegExp(/(-?\d+)px (-?\d+)px/)
  const res = (style || '').match(re)
  if (!res) return 0
  const left = parseFloat(res[1])
  const top = parseFloat(res[2])
  rating += left / 16
  rating += top === -21 ? -0.5 : 0

  return rating
}

/**
 * @param { string } url
 * @returns {[string, string]}
 */
function _parseUrl(url) {
  const res = url.split('/').filter((element) => element !== '')
  const gid = res[res.length - 2]
  const token = res[res.length - 1]
  return [gid, token]
}
/**
 * 解析并去重url
 */
async function parseHTMLAnchorElement(document) {
  const as = document.querySelectorAll('a[href*=".org/g/"]')
  const pathnameList = Array.from(as)
    .map((a) => a.href)
    .map((url) => new URL(url).pathname.slice(3, -1))
  return uniq(pathnameList).map((pathname) => pathname.split('/'))
}

/**
 * Value cell of a #gdd row by its label ("Posted:", "Length:", ...).
 * Label matching survives rows being added or removed.
 * @param {Document} document
 * @param {string} label
 */
function _gddValue(document, label) {
  const row = Array.from(document.querySelectorAll('#gdd tr')).find((tr) => {
    const td = tr.querySelector('.gdt1')
    return td && td.textContent.trim().toLowerCase() === label.toLowerCase()
  })
  const td = row && row.querySelector('.gdt2')
  return td ? td.textContent.trim() : ''
}

/**
 * "Showing 21 - 40 of 123 images" -> { from: 21, to: 40, total: 123 }
 * @param {Document} document
 */
function parseShowing(document) {
  const el = document.querySelector('.gtb .gpc, .gpc')
  const text = el ? el.textContent.replace(/,/g, '') : ''
  const m = text.match(/(\d+)\s*-\s*(\d+)\s*of\s*(\d+)/)
  return m ? { from: +m[1], to: +m[2], total: +m[3] } : null
}

/**
 * 0-based index of the current thumbnail page and the number of pages,
 * from the .ptt pager (current page is td.ptds).
 * @param {Document} document
 */
function parsePager(document) {
  const ptt = document.querySelector('table.ptt')
  if (!ptt) return { page: 0, pageCount: 1 }
  const nums = Array.from(ptt.querySelectorAll('td'))
    .map((td) => parseInt(td.textContent.trim(), 10))
    .filter((n) => !isNaN(n))
  const cur = ptt.querySelector('td.ptds')
  const curNum = cur ? parseInt(cur.textContent.trim(), 10) : 1
  return {
    page: isNaN(curNum) ? 0 : curNum - 1,
    pageCount: nums.length ? Math.max(...nums) : 1,
  }
}

/**
 * Thumbnails per detail page, derived from the page itself (20/40/100/200
 * for large thumbs, 40/100/200/400 for normal ones depending on the
 * account setting), never assumed.
 */
function derivePerPage(showing, page, count) {
  if (!showing) return count
  const { from, to, total } = showing
  if (page > 0) return Math.round((from - 1) / page) // exact on any page > 0
  if (to < total) return to - from + 1 // first page of several
  return Math.max(count, to - from + 1) // single page: everything is here
}

/**
 * Detail page thumbnails (#gdt). Since 2024 both large (#gdt.gt200) and
 * normal (#gdt.gt100) thumbs are
 *   <a href=".../s/<imgkey>/<gid>-<n>"><div title="Page n: file"
 *      style="width:Wpx;height:Hpx;background:transparent url(SPRITE) -Xpx 0 no-repeat"></div></a>
 * i.e. CSS sprites. Older markup (div.gdtm / div.gdtl with an <img>) is
 * still accepted.
 * @param {Document} document
 */
function parseDetailPageList(document) {
  const gdt = document.getElementById('gdt')
  const showing = parseShowing(document)
  const { page, pageCount } = parsePager(document)
  const anchors = gdt ? Array.from(gdt.querySelectorAll('a[href*="/s/"]')) : []

  const list = anchors.map((a, i) => {
    const url = a.getAttribute('href')
    const div = a.querySelector('div[title], div[style]')
    const img = a.querySelector('img')
    const title =
      (div && div.getAttribute('title')) ||
      (img && img.getAttribute('title')) ||
      ''
    const fromHref = url.match(/-(\d+)(?:\?.*)?$/)
    const fromTitle = title.match(/Page (\d+)/)
    const n = fromHref ? +fromHref[1] : fromTitle ? +fromTitle[1] : null

    let thumb = img
      ? img.getAttribute('data-src') || img.getAttribute('src') || ''
      : ''
    let sprite = null
    const style = (div && div.getAttribute('style')) || ''
    const m = style.match(/url\(([^)]+)\)\s*(-?\d+)(?:px)?\s+(-?\d+)?/)
    if (m) {
      thumb = m[1].replace(/^['"]|['"]$/g, '')
      const w = style.match(/width:\s*(\d+)px/)
      const h = style.match(/height:\s*(\d+)px/)
      sprite = {
        width: w ? +w[1] : 0,
        height: h ? +h[1] : 0,
        x: -parseInt(m[2], 10) || 0,
        y: m[3] ? -parseInt(m[3], 10) || 0 : 0,
      }
    }
    const index = n !== null ? n - 1 : (showing ? showing.from - 1 : 0) + i
    const aspectratio =
      sprite && sprite.width && sprite.height
        ? sprite.width / sprite.height
        : undefined
    return { index, url, thumb, sprite, aspectratio }
  })

  const lengthText = _gddValue(document, 'Length:')
  const total =
    (showing && showing.total) ||
    parseInt(lengthText.replace(/[^0-9]/g, ''), 10) ||
    list.length

  return {
    list,
    total,
    perPage: derivePerPage(showing, page, list.length),
    page,
    pageCount,
    size: gdt && gdt.classList.contains('gt200') ? 'large' : 'normal',
  }
}

function parseDetailPageCommentList(document) {
  const divs = document.querySelectorAll('#cdiv .c1')

  if (divs.length === 0) return []

  return Array.from(divs).map((c1) => {
    const res = {}
    const c3 = c1.querySelector('.c3') // time + name
    const c5 = c1.querySelector('.c5 [id^=comment]') //  score
    const c6 = c1.querySelector('.c6') // comment
    const [, time, name] = c3.textContent
      ? c3.textContent.match(/Posted on (.*?)by:(.*)/).map((v) => v.trim())
      : []
    res.time = dayjs(time + 'Z', { utc: true }).valueOf()
    res.userName = name
    res.score = c5 ? c5.textContent : ''

    res.comment = sanitizeCommentHtml(c6.innerHTML)
    return res
  })
}

function parseDetailPageTagList(document) {
  const trs = document.querySelectorAll('#taglist tr')

  if (trs.length === 0) return []
  return Array.from(trs).map((tr) => {
    const res = {}

    // parse tag Category: <td class="tc">ns:</td><td><div class="gt|gtl|gtw">
    const tds = tr.querySelectorAll('td')
    res.namespace = tds[0].textContent.trim().replace(/:$/, '')
    res.tags = Array.from((tds[1] && tds[1].children) || []).map((div) => {
      const name = div.textContent.trim()
      const keyword = res.namespace + ':' + name
      const dash = div.classList.contains('gtl')
      return { name, keyword, dash }
    })
    return res
  })
}

/**
 * @param { Document } document
 * @param { string } html
 */
function parseDetailPageInfo(document, html) {
  const text = (sel) => {
    const el = document.querySelector(sel)
    return el ? el.textContent : ''
  }
  const rating_count = text('#rating_count')

  let favoritelink = text('#favoritelink')
  if (favoritelink.includes('Add to Favorites')) favoritelink = ''

  const favcount = text('#favcount').replace(/[^0-9]/g, '')

  const match = (re) => {
    const m = html.match(re)
    return m ? m[1] : ''
  }
  const gid = match(/var gid = (\d+);/)
  const token = match(/var token = "(.*?)";/)
  const rating = match(/var average_rating = ([0-9.]+)?;/)
  const gd1 = document.querySelector('#gd1 div')
  const coverStyle = (gd1 && gd1.getAttribute('style')) || html
  const coverMatch = coverStyle.match(/url\((.*?)\)/)
  const thumb = coverMatch ? coverMatch[1] : ''
  const category = text('#gdc div')
  const title = text('#gn')
  const title_jpn = text('#gj') || title
  // disowned galleries have no uploader link
  const uploader = text('#gdn a') || text('#gdn').trim()
  const postedText = _gddValue(document, 'Posted:')
  const posted = postedText
    ? dayjs(postedText + 'Z', { utc: true }).valueOf()
    : 0
  const language = _gddValue(document, 'Language:').replace(/\s+TR$/, '')
  const filesize = _gddValue(document, 'File Size:')
  const filecount = _gddValue(document, 'Length:').replace(/[^0-9]/g, '')
  const torrentMatch = html.match(/Torrent Download \((\d+)\)/)
  const torrentcount = torrentMatch ? torrentMatch[1] : '0'
  return {
    gid,
    token,
    title,
    title_jpn,
    thumb,
    posted,
    category,
    uploader,
    url: `${baseURL}/g/${gid}/${token}`,
    language,
    filesize,
    filecount,
    torrentcount,
    rating,
    rating_count,
    favcount,
    favoritelink,
  }
}

/** true when the page is the content-warning interstitial (nw=1 not honoured) */
function isContentWarning(document) {
  const text = document.body ? document.body.textContent : ''
  return (
    !document.getElementById('gdt') &&
    /Content Warning|Offensive For Everyone/i.test(text)
  )
}
/**
 * @param {Document} document
 */
function parseBigImg(document) {
  const img = document.getElementById('img')
  if (!img) {
    // multi-page-viewer only layout or an error page
    throw new Error('[image] no #img on the image page (MPV-only or error)')
  }
  const url = img.getAttribute('src') || ''
  if (/\/509s?\.gif$/.test(url)) {
    throw new Error('[509] image viewing limit exceeded')
  }
  const loadfail = document.getElementById('loadfail')
  const onclick = loadfail ? loadfail.getAttribute('onclick') || '' : ''
  const m = onclick.match(/nl\('([^']*)'\)/) || onclick.match(/'(.*)'/)
  return { url, retryURL: m ? m[1] : '' }
}

/**
 * @param { Document } document
 * @returns {{url:string, name:string, hash:string}[]}
 */
function parseTorrentList(document) {
  const tables = document.querySelectorAll('table')
  if (tables.length === 0) return []
  const list = Array.from(tables)
    .map((table) => {
      try {
        const trs = table.querySelectorAll('tr')
        const tr0tds = trs[0].querySelectorAll('td')
        const info = {}
        Array.from(tr0tds).forEach((td) => {
          const str = td.textContent
          if (str !== '') {
            const [key, value] = getKV(str)

            if (key.toLowerCase() === 'posted') {
              info[key.toLowerCase()] = dayjs(value, { utc: true }).valueOf()
            } else info[key.toLowerCase()] = value
          }
        })
        const tr1td0 = trs[1].querySelector('td')
        const [key, value] = getKV(tr1td0.textContent)
        info[key.toLowerCase()] = value
        const a = trs[2].querySelector('a')
        info.url = a.href
        info.name = a.textContent
        info.hash = a.href.split('/').pop().split('.').shift()
        return info
      } catch (e) {
        return null
      }
    })
    .filter((v) => v)
  return list
}

/**
 * @param { string } str
 */
function getKV(str) {
  return str
    .replace(/:/, '=')
    .split('=')
    .map((v) => v.trim())
}

module.exports = {
  parseGalleryList,
  parseSearchText,
  parseCursors,
  detectListMode,
  parseShowing,
  parsePager,
  derivePerPage,
  isContentWarning,
  parseHTMLAnchorElement,
  parseDetailPageList,
  parseDetailPageCommentList,
  parseDetailPageTagList,
  parseDetailPageInfo,
  parseBigImg,
  parseTorrentList,
}
