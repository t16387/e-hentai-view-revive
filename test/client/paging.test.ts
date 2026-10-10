import { describe, expect, it } from 'vitest'
import {
  clampIndex,
  ComicSlot,
  DEFAULT_ASPECT,
  horizontalStep,
  indexAtScroll,
  mergePage,
  pageOfIndex,
  pagesToLoad,
  prefixOffsets,
  resolveStartIndex,
  tapZone,
  visibleRange,
} from '@/widgets/comic/paging'

const item = (index: number, aspectratio?: number) => ({
  index,
  url: `https://e-hentai.org/s/${index.toString(16).padStart(10, '0')}/1000001-${index + 1}`,
  thumb: 'https://thumbs.example.hath.network/x.webp',
  sprite: null,
  aspectratio: aspectratio as number,
})
/** what the server returns for thumbnail page p */
const page = (p: number, perPage: number, total: number) => {
  const out = []
  for (let i = p * perPage; i < Math.min(total, (p + 1) * perPage); i++) out.push(item(i))
  return out
}

describe('pageOfIndex / pagesToLoad', () => {
  it.each([20, 40, 100, 200, 400])('boundaries with %i thumbs per page', (perPage) => {
    expect(pageOfIndex(0, perPage)).toBe(0)
    expect(pageOfIndex(perPage - 1, perPage)).toBe(0)
    expect(pageOfIndex(perPage, perPage)).toBe(1)
    expect(pageOfIndex(3 * perPage + 7, perPage)).toBe(3)
  })
  it('falls back to 20 when perPage is unknown', () => {
    expect(pageOfIndex(25, 0)).toBe(1)
  })
  it('prefetches the next page near a boundary, never past the end', () => {
    expect(pagesToLoad(15, 20, 100)).toEqual([0, 1])
    expect(pagesToLoad(5, 20, 100)).toEqual([0])
    expect(pagesToLoad(95, 20, 100)).toEqual([4])
    expect(pagesToLoad(35, 40, 100)).toEqual([0, 1])
    expect(pagesToLoad(150, 100, 160)).toEqual([1])
  })
})

describe('mergePage (absolute indices)', () => {
  it.each([20, 40, 100])('every slot holds its own image with %i per page, any arrival order', (perPage) => {
    const total = perPage * 3 + 5
    let list: ComicSlot[] = []
    for (const p of [0, 3, 1, 2, 1]) list = mergePage(list, page(p, perPage, total), total)
    expect(list).toHaveLength(total)
    list.forEach((slot, i) => expect(slot?.index).toBe(i))
  })

  it('regression: 40-per-page data is no longer merged at p*20', () => {
    const list = mergePage(mergePage([], page(0, 40, 100), 100), page(1, 40, 100), 100)
    expect(list[40]?.index).toBe(40)
    expect(list[59]?.index).toBe(59)
    expect(list[79]?.index).toBe(79)
    expect(list[80]).toBeUndefined()
  })

  it('never overwrites a filled slot with undefined, ignores out-of-range items', () => {
    const base = mergePage([], page(0, 20, 45), 45)
    const merged = mergePage(base, [undefined, item(99), item(-1)], 45)
    expect(merged.slice(0, 20).every(Boolean)).toBe(true)
    expect(merged).toHaveLength(45)
  })

  it('last partial page', () => {
    const list = mergePage([], page(2, 20, 45), 45)
    expect(list.filter(Boolean).map((s) => s!.index)).toEqual([40, 41, 42, 43, 44])
  })

  it('keeps a measured aspect ratio when the same page arrives again', () => {
    const measured = mergePage([], [item(0, 0.5)], 3)
    expect(mergePage(measured, [item(0)], 3)[0]?.aspectratio).toBe(0.5)
  })

  it('items without index fall back to the page offset', () => {
    const legacy = [{ url: 'u20', thumb: '', aspectratio: 1 }, { url: 'u21', thumb: '', aspectratio: 1 }] as any
    const list = mergePage([], legacy, 30, 20)
    expect(list[20]?.url).toBe('u20')
    expect(list[21]?.url).toBe('u21')
  })
})

describe('resolveStartIndex', () => {
  it('explicit ?current= wins, including 0', () => {
    expect(resolveStartIndex({ query: '0', history: 30, total: 100 })).toBe(0)
    expect(resolveStartIndex({ query: '57', history: 30, total: 100 })).toBe(57)
  })
  it('then the saved position, then 0', () => {
    expect(resolveStartIndex({ query: undefined, history: 30, total: 100 })).toBe(30)
    expect(resolveStartIndex({ total: 100 })).toBe(0)
  })
  it('ignores junk and clamps to the gallery', () => {
    expect(resolveStartIndex({ query: 'abc', history: 12, total: 100 })).toBe(12)
    expect(resolveStartIndex({ query: '-3', total: 100 })).toBe(0)
    expect(resolveStartIndex({ query: '500', total: 100 })).toBe(99)
    expect(resolveStartIndex({ query: ['7', '8'], total: 100 })).toBe(7)
  })
  it('clampIndex', () => {
    expect(clampIndex(5, 0)).toBe(0)
    expect(clampIndex(NaN, 10)).toBe(0)
    expect(clampIndex(9.7, 10)).toBe(9)
  })
})

describe('mode switch mid-gallery (shared store semantics)', () => {
  // The store is the single source of truth. A mode switch remounts the
  // list component, which starts from store.current; the URL captured when
  // the reader opened (?current=5) must not win.
  it.each([20, 40, 100])('index survives switching across a page boundary (%i per page)', (perPage) => {
    const total = perPage * 3
    const store = { current: resolveStartIndex({ query: '5', total }), list: mergePage([], page(0, perPage, total), total) }
    // read forward across the first thumbnail-page boundary
    store.current = perPage + 1
    for (const p of pagesToLoad(store.current, perPage, total)) store.list = mergePage(store.list, page(p, perPage, total), total)
    // switch mode: the new component reads store.current, not the stale query
    const startOfNewList = store.current
    expect(startOfNewList).toBe(perPage + 1)
    expect(store.list[startOfNewList]?.index).toBe(perPage + 1)
    // "next" goes to +1 and the slot exists
    expect(store.list[startOfNewList + 1]?.index).toBe(perPage + 2)
  })
})

describe('vertical layout maths', () => {
  const width = 1000
  it('offsets and indexAtScroll are inverse for random aspect ratios', () => {
    const list = Array.from({ length: 50 }, (_, i) => item(i, 0.4 + ((i * 37) % 13) / 10))
    const offsets = prefixOffsets(list, width)
    for (let i = 0; i < list.length; i++) expect(indexAtScroll(offsets, offsets[i], 0)).toBe(i)
  })
  it('holes use the default aspect ratio', () => {
    const offsets = prefixOffsets([undefined, undefined], width)
    expect(offsets[1]).toBeCloseTo(width / DEFAULT_ASPECT)
  })
  it('40% viewport rule picks the item covering the upper part of the screen', () => {
    const offsets = prefixOffsets(Array.from({ length: 5 }, (_, i) => item(i, 1)), width) // 1000px each
    expect(indexAtScroll(offsets, 0, 1000)).toBe(0)
    expect(indexAtScroll(offsets, 650, 1000)).toBe(1)
    expect(indexAtScroll(offsets, 99999, 1000)).toBe(4)
  })
  it('visibleRange mounts a window, not the whole gallery', () => {
    const offsets = prefixOffsets(Array.from({ length: 500 }, (_, i) => item(i, 1)), width)
    const r = visibleRange(offsets, 250, 1000)
    expect(r.start).toBe(248)
    expect(r.end).toBeGreaterThanOrEqual(255)
    expect(r.end - r.start).toBeLessThan(12)
    expect(visibleRange(offsets, 0, 1000).start).toBe(0)
    expect(visibleRange(offsets, 499, 1000)).toEqual({ start: 497, end: 500 })
  })
  it('visibleRange covers several screens of short (wide) images', () => {
    const offsets = prefixOffsets(Array.from({ length: 100 }, (_, i) => item(i, 4)), width) // 250px each
    const r = visibleRange(offsets, 10, 1000)
    expect(offsets[r.end] - offsets[10]).toBeGreaterThanOrEqual(3000)
  })
})

describe('reader paging with 200 thumbnails per page', () => {
  const perPage = 200
  const total = 450
  it('pagesToLoad around the 200 boundary and the partial last page', () => {
    expect(pagesToLoad(0, perPage, total)).toEqual([0])
    expect(pagesToLoad(195, perPage, total)).toEqual([0, 1])
    expect(pagesToLoad(200, perPage, total)).toEqual([1])
    expect(pagesToLoad(399, perPage, total)).toEqual([1, 2])
    expect(pagesToLoad(449, perPage, total)).toEqual([2])
    expect(pagesToLoad(10_000, perPage, total)).toEqual([2])
  })
  it('mergePage keeps absolute order whatever order pages arrive in', () => {
    let list: ComicSlot[] = []
    for (const p of [2, 0, 1]) list = mergePage(list, page(p, perPage, total), total)
    expect(list).toHaveLength(total)
    list.forEach((slot, i) => expect(slot?.index).toBe(i))
  })
  it('a start index on page 2 resolves and maps to the right page', () => {
    const start = resolveStartIndex({ query: '401', total })
    expect(start).toBe(401)
    expect(pageOfIndex(start, perPage)).toBe(2)
    expect(resolveStartIndex({ query: '9999', total })).toBe(total - 1)
  })
})

describe('horizontalStep / tapZone (LTR vs RTL)', () => {
  it('LTR: left goes back, right goes forward', () => {
    expect(horizontalStep('ltr', 'left')).toBe(-1)
    expect(horizontalStep('ltr', 'right')).toBe(1)
  })
  it('RTL: left goes forward, right goes back', () => {
    expect(horizontalStep('rtl', 'left')).toBe(1)
    expect(horizontalStep('rtl', 'right')).toBe(-1)
  })
  it('tapZone splits the viewport into thirds', () => {
    expect(tapZone(10, 0, 300)).toBe('left')
    expect(tapZone(150, 0, 300)).toBe('center')
    expect(tapZone(290, 0, 300)).toBe('right')
    expect(tapZone(0, 0, 0)).toBe('center')
  })
})
