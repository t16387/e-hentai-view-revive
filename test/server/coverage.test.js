import { describe, expect, it } from 'vitest'
import { require, doc } from './helpers'
const { JSDOM } = require('jsdom')
const {
  parseGalleryList,
  parseDetailPageList,
} = require('../../server/src/gallery/galleryParser')
const {
  parseFavoritesSettingInfo,
} = require('../../server/src/favorites/favoritesPaeser')
const { listFromDocument } = require('../../server/src/gallery/listPage')
const { GalleryMode } = require('../../server/src/constant')

/**
 * Structure-only detail page (2024+ #gdt sprite markup) for any
 * thumbnails-per-page setting. Fake ids/keys, no content.
 */
function detailPage({ perPage, total, p, size = 'gt100' }) {
  const from = p * perPage + 1
  const to = Math.min(total, (p + 1) * perPage)
  const pageCount = Math.ceil(total / perPage)
  const pager = []
  for (let i = 0; i < pageCount; i++)
    pager.push(
      i === p
        ? `<td class="ptds"><a href="https://e-hentai.org/g/1000001/aaaaaaaaaa/?p=${i}">${
            i + 1
          }</a></td>`
        : `<td><a href="https://e-hentai.org/g/1000001/aaaaaaaaaa/?p=${i}">${
            i + 1
          }</a></td>`
    )
  const thumbs = []
  for (let n = from; n <= to; n++)
    thumbs.push(
      `<a href="https://e-hentai.org/s/${n
        .toString(16)
        .padStart(
          10,
          '0'
        )}/1000001-${n}"><div title="Page ${n}: placeholder${n}.jpg" style="width:100px;height:142px;background:transparent url(https://thumbs.example.hath.network/c1/placeholder/1000001-${Math.floor(
        (n - 1) / 20
      )}.webp) -${((n - 1) % 20) * 100}px 0 no-repeat"></div></a>`
    )
  const gtb = `<div class="gtb"><p class="gpc">Showing ${from} - ${to} of ${total} images</p><table class="ptt"><tr>${pager.join(
    ''
  )}</tr></table></div>`
  return new JSDOM(
    `<!DOCTYPE html><html><body><div id="gdd"><table><tr><td class="gdt1">Length:</td><td class="gdt2">${total} pages</td></tr></table></div>${gtb}<div id="gdt" class="${size}">${thumbs.join(
      ''
    )}</div>${gtb}</body></html>`
  ).window.document
}

describe('thumbnails per page (account setting) 40 / 100 / 200', () => {
  it.each([
    [40, 450],
    [100, 450],
    [200, 450],
    [200, 1000],
  ])(
    '%i per page, %i images: every page has the right absolute indices',
    (perPage, total) => {
      const pageCount = Math.ceil(total / perPage)
      for (let p = 0; p < pageCount; p++) {
        const page = parseDetailPageList(detailPage({ perPage, total, p }))
        expect(page.perPage).toBe(perPage)
        expect(page.pageCount).toBe(pageCount)
        expect(page.page).toBe(p)
        expect(page.total).toBe(total)
        expect(page.list[0].index).toBe(p * perPage)
        const last = Math.min(total, (p + 1) * perPage) - 1
        expect(page.list[page.list.length - 1].index).toBe(last)
        expect(page.list.length).toBe(last - p * perPage + 1)
        page.list.forEach((t, i) => expect(t.index).toBe(p * perPage + i))
      }
    }
  )

  it('200 per page on a single page smaller than the setting', () => {
    const page = parseDetailPageList(
      detailPage({ perPage: 200, total: 137, p: 0 })
    )
    expect(page.list).toHaveLength(137)
    expect(page.pageCount).toBe(1)
    // a single page cannot tell 137 from 200; it only needs to cover the gallery
    expect(page.perPage).toBeGreaterThanOrEqual(137)
  })

  it('large thumbnails report size "large"', () => {
    const page = parseDetailPageList(
      detailPage({ perPage: 40, total: 90, p: 1, size: 'gt200' })
    )
    expect(page.size).toBe('large')
    expect(page.list[0].sprite).toMatchObject({ width: 100, height: 142 })
  })
})

describe('minimal list mode', () => {
  const d = doc('list-minimal.html')
  const res = parseGalleryList(d, GalleryMode.FrontPage)
  it('is detected and parsed (header and ad rows skipped)', () => {
    expect(res.displayMode).toBe('minimal')
    expect(res.list.map((g) => g.gid)).toEqual([
      '3000003',
      '3000002',
      '3000001',
    ])
    expect(res.total).toBe(2345)
    expect(res.next).toBe('3000001')
    expect(res.prev).toBe('3000003')
  })
  it('row fields', () => {
    const [a, b, c] = res.list
    expect(a).toMatchObject({
      token: 'cccccccccc',
      title: 'Title M1',
      category: 'Non-H',
      uploader: 'uploaderm1',
      rating: 3.5,
    })
    expect(a.posted).toBeGreaterThan(0)
    expect(b.thumb).toMatch(/placeholderm2/) // data-src wins over the lazy placeholder
    expect(b.rating).toBe(5)
    expect(c.rating).toBe(0)
    expect(c.uploader).toBe('') // disowned: no uploader link
    expect(c.thumb).toBe('')
  })
  it('goes through listFromDocument (no parse error)', () => {
    expect(listFromDocument(d, GalleryMode.FrontPage).list).toHaveLength(3)
  })
})

describe('extended list mode via listFromDocument', () => {
  it('keeps tags and the cursor', () => {
    const res = listFromDocument(
      doc('list-extended.html'),
      GalleryMode.FrontPage
    )
    expect(res.displayMode).toBe('extended')
    expect(res.list[0].tags.length).toBeGreaterThan(0)
    expect(res.list[0].filecount).toBe(12)
    expect(res.next).toBe('2000002')
  })
})

describe('favorites page 2 / categories', () => {
  const d = doc('favorites-p2.html')
  it('list with <gid>-<favtime> cursors, no uploader', () => {
    const res = listFromDocument(d, GalleryMode.Favorites)
    expect(res.list.map((g) => g.gid)).toEqual(['4000002', '4000001'])
    expect(res.list.every((g) => g.uploader === '')).toBe(true)
    expect(res.next).toBe('4000001-1700000100')
    expect(res.prev).toBe('4000002-1700000200')
    expect(res.total).toBe(15)
  })
  it('category counts > 0 (and the "show all" box is not a category)', () => {
    const info = parseFavoritesSettingInfo(d)
    expect(info[0]).toEqual({ favName: 'All', count: 15, index: 'all' })
    expect(info.slice(1).map((c) => [c.index, c.count, c.favName])).toEqual([
      [0, '12', 'Favorites 0'],
      [1, '3', 'Favorites 1'],
      [2, '0', 'Favorites 2'],
    ])
  })
})
