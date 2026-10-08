import { EVENT_LOAD_MORE_PAGE } from '@/constant'
import { proxyUrl } from '@/components/ProxyImg'
import { ComicListDataSourceProps } from '@/widgets/comic/utils'
import {
  ImageLoader,
  ImageState,
  LoaderDeps,
  prefetchOrder,
  ResolvedImage,
} from '@/widgets/comic/imageLoader'
import { pageOfIndex, ComicSlot } from '@/widgets/comic/paging'
import Router from 'next/router'
import { useEffect, useRef, useState } from 'react'
import useEventManager from './useEventListenerEnhance'

/** H@H / thumbnail hosts that serve signed URLs without cookies */
export function canLoadDirect(url: string) {
  try {
    const u = new URL(url)
    return (
      u.protocol === 'https:' &&
      !u.username &&
      /(^|\.)(hath\.network|ehgt\.org)$/.test(u.hostname)
    )
  } catch (e) {
    return false
  }
}

async function resolveImage(
  pageUrl: string,
  signal: AbortSignal
): Promise<ResolvedImage> {
  const res = await fetch(
    '/api/gallery/loadImg?url=' + encodeURIComponent(pageUrl),
    { signal, credentials: 'same-origin' }
  )
  const data = await res.json()
  if (data.error || !data.url) {
    const message: string = data.message || 'load failed'
    if (/No login/.test(message) || data.code === 'sad panda')
      Router.replace('/signin')
    throw new Error(message)
  }
  return { url: data.url, retryKey: data.retryURL || '' }
}

/** download + decode an image without showing it; abort clears the src */
export function preloadImage(
  src: string,
  { signal, priority }: { signal: AbortSignal; priority: 'high' | 'low' }
) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    if (signal.aborted) return reject(new Error('aborted'))
    const img = new Image()
    const abort = () => {
      img.onload = img.onerror = null
      img.src = ''
      reject(new Error('aborted'))
    }
    signal.addEventListener('abort', abort, { once: true })
    img.decoding = 'async'
    img.referrerPolicy = 'no-referrer'
    ;(img as any).fetchPriority = priority
    img.onload = () => {
      signal.removeEventListener('abort', abort)
      const decoded = img.decode ? img.decode().catch(() => {}) : null
      // the element is the handle the queue keeps for nearby pages
      Promise.resolve(decoded).then(() => resolve(img))
    }
    img.onerror = () => {
      signal.removeEventListener('abort', abort)
      reject(new Error('image error'))
    }
    img.src = src
  })
}

/** quiet period before a moving reader position is acted on */
const SETTLE_MS = 200

interface Holder {
  loader: ImageLoader
  list: ComicSlot[]
}
const holders = new Map<string, Holder>()

export function getImageLoader(
  comicPagesKey: string,
  deps?: Partial<LoaderDeps>
) {
  let h = holders.get(comicPagesKey)
  if (!h) {
    const holder: Holder = { list: [], loader: null as unknown as ImageLoader }
    holder.loader = new ImageLoader({
      pageUrlOf: (i) => holder.list[i]?.url,
      resolve: resolveImage,
      load: preloadImage,
      toSrc: (url, via) => (via === 'direct' ? url : proxyUrl(url)),
      canLoadDirect,
      ...deps,
    })
    holders.set(comicPagesKey, holder)
    h = holder
  }
  return h
}

/** leaving the reader: cancel everything and forget the gallery */
export function disposeImageLoader(comicPagesKey: string) {
  const h = holders.get(comicPagesKey)
  if (!h) return
  h.loader.destroy()
  holders.delete(comicPagesKey)
}

/**
 * Drive the image queue from a reader list (vertical or horizontal):
 * current image first, then a few ahead, cancel the rest; make sure the
 * thumbnail pages holding those images are requested.
 */
export function useReaderImageQueue(
  comicPagesKey: string,
  data: ComicListDataSourceProps | undefined,
  opts: { direct?: boolean; ahead?: number; behind?: number } = {}
) {
  const { direct = true, ahead = 4, behind = 1 } = opts
  const loadMorePage$ = useEventManager(EVENT_LOAD_MORE_PAGE)
  const holder = getImageLoader(comicPagesKey)
  const list = data?.list
  const total = data?.total || 0
  const current = data?.current || 0
  const perPage = data?.perPage || 0
  const lastChange = useRef(0)

  useEffect(() => holder.loader.setDirect(direct), [holder, direct])

  // new thumbnail pages: page URLs may now be known
  useEffect(() => {
    holder.list = list || []
    holder.loader.pump()
  }, [holder, list])

  useEffect(() => {
    if (!total) return
    const order = prefetchOrder(current, total, { ahead, behind })
    // thumbnail pages first (an image needs its page URL), including the
    // jump target of ?current=N, which no mounted item asked for yet
    new Set(order.map((i) => pageOfIndex(i, perPage))).forEach((p) =>
      loadMorePage$.emit(p)
    )
    // fast scrolling changes `current` every few ms: start the images
    // where the reader settles instead of a request burst along the way
    // (immediate when the position was still for a while: open, jump, swipe)
    const run = () => holder.loader.want(order)
    const quiet = Date.now() - lastChange.current > SETTLE_MS * 2
    lastChange.current = Date.now()
    if (quiet) return run()
    const id = setTimeout(run, SETTLE_MS)
    return () => clearTimeout(id)
  }, [holder, current, total, perPage, ahead, behind, loadMorePage$])

  // mode switch / leaving: stop prefetching for this list
  useEffect(() => () => holder.loader.want([]), [holder])

  return holder.loader
}

/** state of one image, re-rendering only that item when it changes */
export function useImageState(comicPagesKey: string, index: number) {
  const { loader } = getImageLoader(comicPagesKey)
  const [state, setState] = useState<ImageState>(() => loader.getState(index))
  useEffect(() => {
    setState(loader.getState(index))
    return loader.subscribe(index, setState)
  }, [loader, index])
  return [state, loader] as const
}
