/**
 * Pure paging / index logic of the reader, kept free of React and the DOM
 * so it can be unit tested (test/client/paging.test.ts).
 */
import { DetailPageListItemProps } from '@/interface/gallery'

export const DEFAULT_ASPECT = 210 / 297
/** fallback until page 0 tells us the real thumbnails-per-page */
export const DEFAULT_PER_PAGE = 20

export type ComicSlot = DetailPageListItemProps | undefined

/** detail-page thumbnail page (?p=N) that contains image `index` */
export function pageOfIndex(index: number, perPage: number) {
  const size = perPage > 0 ? perPage : DEFAULT_PER_PAGE
  return Math.floor(Math.max(0, index) / size)
}

/** thumbnail pages needed to show `index` and prefetch `lookahead` images */
export function pagesToLoad(
  index: number,
  perPage: number,
  total: number,
  lookahead = 7
) {
  const last = Math.max(0, total - 1)
  const a = pageOfIndex(Math.min(index, last), perPage)
  const b = pageOfIndex(Math.min(index + lookahead, last), perPage)
  return a === b ? [a] : [a, b]
}

/**
 * Merge one thumbnail page into the reader list by **absolute** image index.
 * The old mergeData() placed item j of page p at p*20+j, which scrambled the
 * order whenever the site returned 40/100/200 thumbnails per page.
 * - result length is always `total`
 * - existing slots are never replaced by undefined
 * - pages may arrive in any order, duplicates are harmless
 */
export function mergePage(
  list: ComicSlot[],
  items: ComicSlot[],
  total: number,
  fallbackOffset = 0
): ComicSlot[] {
  const length = Math.max(total, 0)
  const res: ComicSlot[] = new Array(length)
  for (let i = 0; i < length; i++) res[i] = list[i]
  items.forEach((item, j) => {
    if (!item) return
    const index =
      typeof item.index === 'number' ? item.index : fallbackOffset + j
    if (index < 0 || index >= length) return
    const prev = res[index]
    // keep a measured aspect ratio from an already-loaded image
    res[index] =
      prev && prev.url === item.url && prev.aspectratio && !item.aspectratio
        ? { ...item, aspectratio: prev.aspectratio }
        : item
  })
  return res
}

export function clampIndex(index: number, total: number) {
  if (!(total > 0)) return 0
  if (!Number.isFinite(index)) return 0
  return Math.min(Math.max(0, Math.trunc(index)), total - 1)
}

function parseIndex(value: unknown): number | null {
  const raw = Array.isArray(value) ? value[0] : value
  if (raw === undefined || raw === null || raw === '') return null
  const n = typeof raw === 'number' ? raw : Number(raw)
  return Number.isInteger(n) && n >= 0 ? n : null
}

/**
 * Index the reader opens at, resolved **once** when the read page mounts:
 * explicit ?current= (0 is valid), then the saved reading position, then 0.
 * Later mode switches never consult the URL again; the new list component
 * starts from the shared store's `current`.
 */
export function resolveStartIndex(opts: {
  query?: unknown
  history?: number
  total: number
}) {
  const fromQuery = parseIndex(opts.query)
  if (fromQuery !== null) return clampIndex(fromQuery, opts.total)
  const fromHistory = parseIndex(opts.history)
  if (fromHistory !== null) return clampIndex(fromHistory, opts.total)
  return 0
}

/** rendered height of an image of the given aspect ratio */
export function itemHeight(aspect: number | undefined, width: number) {
  return width / (aspect && aspect > 0 ? aspect : DEFAULT_ASPECT)
}

/** top offset of every item plus the full height as the last element */
export function prefixOffsets(list: ComicSlot[], width: number) {
  const offsets = new Array<number>(list.length + 1)
  offsets[0] = 0
  for (let i = 0; i < list.length; i++)
    offsets[i + 1] = offsets[i] + itemHeight(list[i]?.aspectratio, width)
  return offsets
}

/**
 * Index of the item considered "current" for a scroll position: the last
 * item whose top is above scrollTop + 40% of the viewport.
 */
export function indexAtScroll(
  offsets: number[],
  scrollTop: number,
  viewportHeight: number
) {
  const n = offsets.length - 1
  if (n <= 0) return 0
  const y = scrollTop + viewportHeight * 0.4
  let lo = 0
  let hi = n - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (offsets[mid] <= y) lo = mid
    else hi = mid - 1
  }
  return lo
}

/**
 * Items the vertical list mounts: a couple before `current` and enough after
 * it to cover `screens` viewports (at least `minAfter` items). Restores the
 * windowing that the last WIP commit removed (it rendered, and therefore
 * fetched, the whole gallery at once).
 */
export function visibleRange(
  offsets: number[],
  current: number,
  viewportHeight: number,
  opts: { before?: number; minAfter?: number; screens?: number } = {}
) {
  const { before = 2, minAfter = 4, screens = 3 } = opts
  const n = offsets.length - 1
  if (n <= 0) return { start: 0, end: 0 }
  const c = clampIndex(current, n)
  const start = Math.max(0, c - before)
  const limit = offsets[c] + viewportHeight * screens
  let end = Math.min(n, c + minAfter + 1)
  while (end < n && offsets[end] < limit) end++
  return { start, end } // end is exclusive
}

/**
 * Index delta for a physical left/right tap or arrow key.
 * RTL (manga) mirrors LTR: left goes forward, right goes back.
 * `direction` is the reader mode ('ltr' | 'rtl'); vertical has no side nav.
 */
export function horizontalStep(
  direction: 'ltr' | 'rtl',
  side: 'left' | 'right'
): -1 | 1 {
  if (side === 'left') return direction === 'rtl' ? 1 : -1
  return direction === 'rtl' ? -1 : 1
}

/** which third of the viewport a tap landed in (center toggles controls) */
export function tapZone(
  clientX: number,
  left: number,
  width: number
): 'left' | 'center' | 'right' {
  if (width <= 0) return 'center'
  const x = (clientX - left) / width
  if (x < 1 / 3) return 'left'
  if (x > 2 / 3) return 'right'
  return 'center'
}
