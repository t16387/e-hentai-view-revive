import { EVENT_LOAD_MORE_PAGE } from '@/constant'
import { DEFAULT_PER_PAGE, mergePage } from '@/widgets/comic/paging'
import {
  ComicListDataSourceProps,
  getPageWithRetry,
} from '@/widgets/comic/utils'
import { useEffect, useRef } from 'react'
import { cache, mutate } from 'swr'
import { readDoNotStoreHistory } from '@/utils/historyPrefs'
import useComicReadPageHistory from './useComicReadPageHistory'
import useEventManager from './useEventListenerEnhance'
import useSharedState from './useSharedState'

function noop() {}
interface UseCommicDataOptions {
  onlyInitData: boolean
}
const defaultOpts: UseCommicDataOptions = {
  onlyInitData: false,
}
const emptyStore: ComicListDataSourceProps = { current: 0, list: [], total: 0 }

/** Downloads offline reader uses /downloads/:id as comicUrl (local images) */
export function isOfflineComicUrl(comicUrl: string) {
  return typeof comicUrl === 'string' && comicUrl.startsWith('/downloads/')
}

export default function useComicData(
  comicUrl: string,
  opts?: UseCommicDataOptions
) {
  const { onlyInitData } = opts || defaultOpts
  const comicPagesKey = `${comicUrl}/read`
  const [, setComicReadPageHistory] = useComicReadPageHistory()
  // thumbnail pages requested (or in flight) during this mount
  const loadedPages = useRef(new Set<number>())
  const loadMorePage$ = useEventManager(EVENT_LOAD_MORE_PAGE)
  const res = useSharedState<ComicListDataSourceProps>(
    comicPagesKey,
    emptyStore
  )
  const { data } = res
  if (!cache.has(comicPagesKey)) cache.set(comicPagesKey, data)

  // page 0: list skeleton (length = total), perPage
  useEffect(() => {
    if (!onlyInitData) return
    if (isOfflineComicUrl(comicUrl)) return
    if (data && data.list.length > 0) return
    let cancelled = false
    getPageWithRetry(`/api/gallery${comicUrl}/0`)
      .then((page) => {
        if (cancelled) return
        mutate(
          comicPagesKey,
          (old: ComicListDataSourceProps = emptyStore) => ({
            ...old,
            total: page.total,
            perPage: page.perPage || old.perPage || DEFAULT_PER_PAGE,
            list: mergePage(old.list || [], page.list, page.total),
          }),
          false
        )
      })
      .catch((e) => console.error(e))
    return () => {
      cancelled = true
    }
  }, [comicPagesKey, comicUrl, data, onlyInitData])

  // further thumbnail pages on demand (emitted by mounted ComicItems)
  useEffect(() => {
    if (onlyInitData) return noop
    if (isOfflineComicUrl(comicUrl)) return noop
    return loadMorePage$.subscribe(async (pageIndex: number) => {
      if (loadedPages.current.has(pageIndex)) return
      loadedPages.current.add(pageIndex)
      try {
        const page = await getPageWithRetry(
          `/api/gallery${comicUrl}/${pageIndex}`
        )
        mutate(
          comicPagesKey,
          (old: ComicListDataSourceProps = emptyStore) => ({
            ...old,
            total: page.total || old.total,
            perPage: old.perPage || page.perPage,
            list: mergePage(
              old.list || [],
              page.list,
              page.total || old.total,
              pageIndex * (old.perPage || page.perPage || DEFAULT_PER_PAGE)
            ),
          }),
          false
        )
      } catch (e) {
        console.error(e)
        // allow a later attempt instead of leaving a permanent hole
        loadedPages.current.delete(pageIndex)
      }
    })
  }, [comicPagesKey, comicUrl, loadMorePage$, onlyInitData])

  // remember the reading position (only once the start index is resolved)
  const current = data?.current
  const ready = data?.ready
  useEffect(() => {
    if (onlyInitData || !ready) return
    if (readDoNotStoreHistory()) return
    if (typeof current === 'number') {
      setComicReadPageHistory((t) => {
        if (current === 0) delete t[comicPagesKey]
        else t[comicPagesKey] = current
        return { ...t }
      })
    }
  }, [comicPagesKey, current, ready, setComicReadPageHistory, onlyInitData])

  return res
}

/** update the shared current index (all modes read it) */
export function setComicCurrent(comicPagesKey: string, current: number) {
  mutate(
    comicPagesKey,
    (old: ComicListDataSourceProps = emptyStore) =>
      old.current === current ? old : { ...old, current },
    false
  )
}
