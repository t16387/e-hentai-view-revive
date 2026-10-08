import { describe, expect, it } from 'vitest'
import { doc, fixture, require } from './helpers'
const {
  parseDetailPageList,
  parseDetailPageInfo,
  parseDetailPageTagList,
  parseDetailPageCommentList,
  parseBigImg,
  isContentWarning,
  derivePerPage,
} = require('../../server/src/gallery/galleryParser')

describe('detail thumbnails, 2024+ #gdt markup', () => {
  it('large thumbs, first of 3 pages', () => {
    const res = parseDetailPageList(doc('detail-large-p0.html'))
    expect(res.list).toHaveLength(20)
    expect(res).toMatchObject({ total: 45, perPage: 20, page: 0, pageCount: 3, size: 'large' })
    expect(res.list[0]).toEqual({
      index: 0,
      url: 'https://e-hentai.org/s/0000000001/1000001-1',
      thumb: 'https://thumbs.example.hath.network/c1/placeholder/1000001-0.webp',
      sprite: { width: 200, height: 283, x: 0, y: 0 },
      aspectratio: 200 / 283,
    })
    expect(res.list[3].sprite.x).toBe(600)
    expect(res.list.map((t) => t.index)).toEqual([...Array(20).keys()])
  })

  it('middle page: absolute indices come from the link / title', () => {
    const res = parseDetailPageList(doc('detail-large-p1.html'))
    expect(res.list[0].index).toBe(20)
    expect(res.list[19].index).toBe(39)
    expect(res).toMatchObject({ perPage: 20, page: 1 })
  })

  it('last partial page still reports the real page size', () => {
    const res = parseDetailPageList(doc('detail-large-p2-last.html'))
    expect(res.list.map((t) => t.index)).toEqual([40, 41, 42, 43, 44])
    expect(res).toMatchObject({ perPage: 20, page: 2, pageCount: 3, total: 45 })
  })

  it('normal thumbs, 40 per page', () => {
    const res = parseDetailPageList(doc('detail-normal40-p1.html'))
    expect(res.list).toHaveLength(40)
    expect(res).toMatchObject({ perPage: 40, page: 1, size: 'normal', total: 100 })
    expect(res.list[0]).toMatchObject({ index: 40, sprite: { width: 100, height: 142, x: 0 } })
    expect(res.list[21].sprite.x).toBe(100) // second sprite sheet restarts at 0
  })

  it('normal thumbs, 100 on a single page', () => {
    const res = parseDetailPageList(doc('detail-normal100-p0-single.html'))
    expect(res.list).toHaveLength(100)
    expect(res).toMatchObject({ perPage: 100, page: 0, pageCount: 1, total: 100 })
  })

  it('falls back to the pre-2024 div.gdtl + <img> markup', () => {
    const res = parseDetailPageList(doc('detail-legacy-gdtl.html'))
    expect(res.list).toHaveLength(20)
    expect(res.list[4]).toEqual({
      index: 4,
      url: 'https://e-hentai.org/s/0000000005/1000001-5',
      thumb: 'https://ehgt.org/00/00/placeholder-5_l.jpg',
      sprite: null,
      aspectratio: undefined,
    })
  })

  it('no #gdt: empty list, no throw', () => {
    const res = parseDetailPageList(doc('detail-content-warning.html'))
    expect(res.list).toEqual([])
  })
})

describe('derivePerPage', () => {
  it.each([
    [{ from: 1, to: 20, total: 45 }, 0, 20, 20],
    [{ from: 21, to: 40, total: 45 }, 1, 20, 20],
    [{ from: 41, to: 45, total: 45 }, 2, 5, 20],
    [{ from: 401, to: 410, total: 410 }, 1, 10, 400],
    [{ from: 1, to: 7, total: 7 }, 0, 7, 7],
    [null, 0, 13, 13],
  ])('%j page %i (%i thumbs) -> %i', (showing, page, count, expected) => {
    expect(derivePerPage(showing, page, count)).toBe(expected)
  })
})

describe('detail info', () => {
  it('parses by row label', () => {
    const html = fixture('detail-large-p0.html')
    const d = doc('detail-large-p0.html')
    expect(parseDetailPageInfo(d, html)).toMatchObject({
      gid: '1000001',
      token: 'aaaaaaaaaa',
      title: 'Title 1',
      title_jpn: 'Title 1',
      thumb: 'https://ehgt.org/w/00/000/00000-cover.webp',
      category: 'Non-H',
      uploader: 'uploader1',
      posted: Date.UTC(2026, 9, 1, 12, 34),
      language: 'Japanese',
      filesize: '12.34 MiB',
      filecount: '45',
      torrentcount: '2',
      rating: '4.25',
      rating_count: '12',
      favcount: '7',
      favoritelink: '',
    })
  })

  it('disowned gallery (no uploader link) does not crash', () => {
    const html = fixture('detail-normal100-p0-single.html')
    const d = doc('detail-normal100-p0-single.html')
    expect(parseDetailPageInfo(d, html).uploader).toBe('(Disowned)')
  })

  it('detects the content-warning interstitial', () => {
    expect(isContentWarning(doc('detail-content-warning.html'))).toBe(true)
    expect(isContentWarning(doc('detail-large-p0.html'))).toBe(false)
  })

  it('tags and comments', () => {
    const d = doc('detail-large-p0.html')
    expect(parseDetailPageTagList(d)).toEqual([
      {
        namespace: 'other',
        tags: [
          { name: 'placeholder a', keyword: 'other:placeholder a', dash: false },
          { name: 'placeholder b', keyword: 'other:placeholder b', dash: true },
        ],
      },
      { namespace: 'language', tags: [{ name: 'placeholder', keyword: 'language:placeholder', dash: false }] },
    ])
    const comments = parseDetailPageCommentList(d)
    expect(comments).toHaveLength(1)
    expect(comments[0]).toMatchObject({ userName: 'commenter', score: '+5' })
  })
})

describe('image page', () => {
  it('returns the image and the nl reload key', () => {
    expect(parseBigImg(doc('image-page.html'))).toEqual({
      url: 'https://abcd.efgh.hath.network:4433/h/placeholder/keystamp=0/12.webp',
      retryURL: '11111-222222',
    })
  })
  it('throws a clear error on the 509 quota image', () => {
    expect(() => parseBigImg(doc('image-page-509.html'))).toThrow(/509/)
  })
  it('throws a clear error on an MPV-only page', () => {
    expect(() => parseBigImg(doc('image-page-mpv.html'))).toThrow(/no #img/)
  })
})
