import { describe, expect, it, vi } from 'vitest'
import { doc, require } from './helpers'
const {
  parseGalleryList,
  parseSearchText,
  parseCursors,
  detectListMode,
} = require('../../server/src/gallery/galleryParser')
const { GalleryMode } = require('../../server/src/constant')

describe('list page parser (compact, current markup)', () => {
  const res = parseGalleryList(doc('list-compact.html'), GalleryMode.FrontPage)

  it('detects the display mode from the table class', () => {
    expect(res.displayMode).toBe('compact')
  })

  it('skips the header row and the single-cell notice row', () => {
    expect(res.list.map((g) => g.gid)).toEqual(['1000003', '1000002', '1000001'])
  })

  it('parses every field of a row', () => {
    expect(res.list[1]).toEqual({
      gid: '1000002',
      token: 'aaaaaaaaaa',
      posted: Date.UTC(2026, 9, 2, 12, 32),
      title: 'Title 2',
      category: 'Non-H',
      rating: 3.5,
      uploader: 'uploader2',
      filecount: 37,
      thumb: 'https://ehgt.org/w/00/000/00000-placeholder2.webp',
      tags: [
        { watched: false, title: 'placeholder a', namespace: 'other', tagName: 'placeholder a' },
        { watched: true, title: 'placeholder b', namespace: 'misc', tagName: 'placeholder b' },
      ],
    })
  })

  it('reads the count from .searchtext (p.ip is gone)', () => {
    expect(res.total).toBe(12345)
    expect(res.totalText).toBe('Found about 12,345 results.')
  })

  it('returns next/prev cursors from #unext/#uprev', () => {
    expect(res.next).toBe('1000001')
    expect(res.prev).toBe('1000004')
  })
})

describe('list page edge cases', () => {
  it('last page: no next cursor, non-numeric count does not throw', () => {
    const res = parseGalleryList(doc('list-compact-last.html'), GalleryMode.FrontPage)
    expect(res.list).toHaveLength(3)
    expect(res.next).toBeNull()
    expect(res.total).toBe(0)
    expect(res.totalText).toBe('Found hundreds of results.')
  })

  it('missing count banner (watched/favorites) does not throw', () => {
    for (const mode of [GalleryMode.Watched, GalleryMode.Favorites, GalleryMode.FrontPage]) {
      const res = parseGalleryList(doc('list-nocount.html'), mode)
      expect(res.list).toHaveLength(3)
      expect(res.total).toBe(0)
    }
  })

  it('favorites rows have no uploader', () => {
    const res = parseGalleryList(doc('list-compact.html'), GalleryMode.Favorites)
    expect(res.list.every((g) => g.uploader === '')).toBe(true)
  })

  it('popular uses the row count as total', () => {
    const res = parseGalleryList(doc('list-nocount.html'), GalleryMode.Popular)
    expect(res.total).toBe(3)
  })

  it('no hits page yields an empty list', () => {
    const res = parseGalleryList(doc('list-nohits.html'), GalleryMode.FrontPage)
    expect(res.list).toEqual([])
    expect(res.next).toBeNull()
  })

  it('extended mode', () => {
    const d = doc('list-extended.html')
    expect(detectListMode(d)).toBe('extended')
    const res = parseGalleryList(d, GalleryMode.FrontPage)
    expect(res.list).toHaveLength(1)
    expect(res.list[0]).toMatchObject({ gid: '2000002', token: 'bbbbbbbbbb', filecount: 12, uploader: 'uploaderx', title: 'Title X' })
    expect(res.next).toBe('2000002')
    expect(res.prev).toBeNull()
  })

  it('thumbnail mode', () => {
    const d = doc('list-thumbnail.html')
    expect(detectListMode(d)).toBe('thumbnail')
    const res = parseGalleryList(d, GalleryMode.FrontPage)
    expect(res.list).toHaveLength(1)
    expect(res.list[0]).toMatchObject({ gid: '3000003', filecount: 7, category: 'Non-H', rating: 3 })
  })

  it('a broken row is skipped, not fatal', () => {
    const d = doc('list-compact.html')
    d.querySelector('#posted_1000002').closest('tr').querySelector('a[href*="/g/"]').setAttribute('href', '/g/notanumber/x/')
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = parseGalleryList(d, GalleryMode.FrontPage)
    spy.mockRestore()
    expect(res.list.map((g) => g.gid)).toEqual(['1000003', '1000001'])
  })
})

describe('parseSearchText / parseCursors helpers', () => {
  const html = (body) => new (require('jsdom').JSDOM)(body).window.document
  it.each([
    ['<div class="searchtext"><p>Found 1 result.</p></div>', 1],
    ['<div class="searchtext"><p>Found about 50,000+ results.</p></div>', 50000],
    ['<div class="searchtext"><p>Found thousands of results.</p></div>', null],
    ['<p class="ip">Showing 1 - 25 of 1,234</p>', 1],
    ['', null],
  ])('%s -> %s', (body, total) => {
    expect(parseSearchText(html(body)).total).toBe(total)
  })

  it('favorites cursors keep the <gid>-<favtime> form', () => {
    const d = html('<a id="unext" href="https://e-hentai.org/favorites.php?favcat=all&amp;next=1000001-1700000000">n</a><a id="uprev" href="https://e-hentai.org/favorites.php?prev=1000009-1700000099">p</a>')
    expect(parseCursors(d)).toEqual({ next: '1000001-1700000000', prev: '1000009-1700000099' })
  })
})

describe('filtered empty list page (exclusions)', () => {
  const { listFromDocument } = require('../../server/src/gallery/listPage')
  it('preserves next/prev when every gallery on the page was excluded', () => {
    const res = listFromDocument(doc('list-filtered-empty-next.html'), GalleryMode.FrontPage)
    expect(res.list).toEqual([])
    expect(res.next).toBe('5000001')
    expect(res.prev).toBe('5000026')
    expect(res.total).toBe(900)
    expect(res.totalText).toMatch(/900/)
  })

  it('true no-hits stays terminal with null cursors', () => {
    const res = listFromDocument(doc('list-nohits.html'), GalleryMode.FrontPage)
    expect(res.list).toEqual([])
    expect(res.next).toBeNull()
    expect(res.prev).toBeNull()
  })
})
