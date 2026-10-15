/**
 * Pure vertical-reader size helpers (no React/DOM beyond optional window).
 * Unit-tested in test/client/comicVerticalSize.test.ts.
 */
import { DEFAULT_ASPECT, ComicSlot, itemHeight } from './paging'

/** Matches the historical hard-coded column cap. */
export const DEFAULT_VERTICAL_MAX_WIDTH = 1280
/** Full viewport width (then capped by max width). */
export const DEFAULT_VERTICAL_WIDTH_PERCENT = 100
/** 0 = unlimited / natural image height. */
export const DEFAULT_VERTICAL_MAX_HEIGHT_VH = 0

export type VerticalSizeOpts = {
  verticalMaxWidth?: number
  verticalWidthPercent?: number
  verticalMaxHeightVh?: number
}

export function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min
  return Math.min(Math.max(n, min), max)
}

/** Coalesce + clamp stored config (missing fields → current defaults). */
export function normalizeVerticalSize(opts: VerticalSizeOpts = {}) {
  return {
    maxWidth: clamp(
      opts.verticalMaxWidth ?? DEFAULT_VERTICAL_MAX_WIDTH,
      320,
      4096
    ),
    widthPercent: clamp(
      opts.verticalWidthPercent ?? DEFAULT_VERTICAL_WIDTH_PERCENT,
      50,
      100
    ),
    maxHeightVh: clamp(
      opts.verticalMaxHeightVh ?? DEFAULT_VERTICAL_MAX_HEIGHT_VH,
      0,
      100
    ),
  }
}

/**
 * Column width the vertical reader lays out at.
 * `viewportWidth` is injectable for tests; in the browser pass window.innerWidth.
 */
export function verticalReaderWidth(
  opts: VerticalSizeOpts = {},
  viewportWidth?: number
) {
  const { maxWidth, widthPercent } = normalizeVerticalSize(opts)
  const vw =
    typeof viewportWidth === 'number' && viewportWidth > 0
      ? viewportWidth
      : typeof window !== 'undefined'
      ? window.innerWidth
      : maxWidth
  return Math.min((vw * widthPercent) / 100, maxWidth)
}

/** Pixel max height for one page, or 0 when unlimited. */
export function verticalReaderMaxHeight(
  opts: VerticalSizeOpts = {},
  viewportHeight?: number
) {
  const { maxHeightVh } = normalizeVerticalSize(opts)
  if (maxHeightVh <= 0) return 0
  const vh =
    typeof viewportHeight === 'number' && viewportHeight > 0
      ? viewportHeight
      : typeof window !== 'undefined'
      ? window.innerHeight
      : 0
  return (vh * maxHeightVh) / 100
}

/**
 * Laid-out size of one page image. When maxHeight is set and the natural
 * height would exceed it, width shrinks to keep aspect ratio (letterbox in
 * the column).
 */
export function verticalItemDims(
  aspect: number | undefined,
  width: number,
  maxHeight = 0
) {
  const natural = itemHeight(aspect, width)
  if (!(maxHeight > 0) || natural <= maxHeight) {
    return { width, height: natural }
  }
  const ratio = aspect && aspect > 0 ? aspect : DEFAULT_ASPECT
  return { width: maxHeight * ratio, height: maxHeight }
}

/** Top offset of every item plus full height as the last element. */
export function verticalPrefixOffsets(
  list: ComicSlot[],
  width: number,
  maxHeight = 0
) {
  const offsets = new Array<number>(list.length + 1)
  offsets[0] = 0
  for (let i = 0; i < list.length; i++) {
    const { height } = verticalItemDims(list[i]?.aspectratio, width, maxHeight)
    offsets[i + 1] = offsets[i] + height
  }
  return offsets
}
