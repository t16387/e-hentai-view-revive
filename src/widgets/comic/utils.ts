import { axios } from '@/apis'
import { DetailThumbPage } from '@/interface/gallery'
import { ComicSlot, DEFAULT_ASPECT, itemHeight } from './paging'
import {
  DEFAULT_VERTICAL_MAX_WIDTH,
  verticalItemDims,
  verticalReaderWidth,
  VerticalSizeOpts,
} from './verticalSize'

export interface ComicListDataSourceProps {
  total: number
  list: ComicSlot[]
  /** current image index, shared by every reading mode */
  current: number
  /** thumbnails per detail page, learned from page 0 */
  perPage?: number
  /** set once read.tsx has resolved the start index for this visit */
  ready?: boolean
}

export const pageDataCache = new Map<string, DetailThumbPage>()

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Fetch one thumbnail page of the gallery. Bounded retries with backoff;
 * the old version retried immediately and forever, hammering the server
 * (and the upstream site) whenever a page failed.
 */
export async function getPageWithRetry(
  url: string,
  retries = 3
): Promise<DetailThumbPage> {
  const cached = pageDataCache.get(url)
  if (cached) return cached
  let lastError: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await axios.get<
        DetailThumbPage & { error: boolean; message: string }
      >(url)
      if (res.data.error) throw new Error(res.data.message)
      pageDataCache.set(url, res.data)
      return res.data
    } catch (error) {
      lastError = error
      if (attempt < retries) await sleep(500 * 2 ** attempt)
    }
  }
  throw lastError
}

/**
 * Width the reader renders images at.
 * Pass vertical size opts in vertical mode; omit for the historical
 * min(viewport, 1280) behaviour.
 */
export function readerWidth(opts?: VerticalSizeOpts) {
  if (opts) return verticalReaderWidth(opts)
  return typeof window === 'undefined'
    ? DEFAULT_VERTICAL_MAX_WIDTH
    : Math.min(window.innerWidth, DEFAULT_VERTICAL_MAX_WIDTH)
}

export function computedAspectratioHeight(
  aspectratio: number = DEFAULT_ASPECT,
  opts?: VerticalSizeOpts & { maxHeightPx?: number }
) {
  const width = readerWidth(opts)
  if (opts && typeof opts.maxHeightPx === 'number') {
    return verticalItemDims(aspectratio, width, opts.maxHeightPx).height
  }
  return itemHeight(aspectratio, width)
}
