import { axios } from '@/apis'
import { GalleriesPage, IndexListItemPorps } from '@/interface/gallery'
import {
  GalleryListMode,
  LIST_JUMP_MAX_WALK,
  SearchFilters,
  estimateListPageCount,
  galleryListKey,
} from '@/utils/search'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSWRInfinite } from 'swr'

export interface UseGalleryListOptions extends SearchFilters {
  mode: GalleryListMode
}

export default function useGalleryList(options: UseGalleryListOptions) {
  const { mode, ...filters } = options
  const [viewPage, setViewPage] = useState(0)
  const [jumping, setJumping] = useState(false)
  const [jumpError, setJumpError] = useState<string | null>(null)
  const jumpGen = useRef(0)

  const { data, error, size, setSize } = useSWRInfinite<GalleriesPage>(
    (pageIndex, previous: GalleriesPage | null) =>
      galleryListKey(mode, filters, pageIndex, previous),
    async (url: string) => {
      const res = await axios.get<GalleriesPage>(url)
      if (res.data.error) throw res.data.message
      return res.data
    },
    { revalidateAll: false }
  )

  const filterIdentity = galleryListKey(mode, filters, 0, null) || mode
  useEffect(() => {
    setViewPage(0)
    setJumpError(null)
    jumpGen.current++
    setSize(1)
  }, [filterIdentity, setSize])

  const pageCountLoaded = data?.length ?? 0
  const current = data?.[viewPage]
  const dataSource: IndexListItemPorps[] = current?.list ?? []
  const isLoadingInitialData = !data && !error
  const waitingOnPage =
    size > 0 && data && typeof data[size - 1] === 'undefined'
  const isLoadingMore = isLoadingInitialData || !!waitingOnPage || jumping

  const firstEmpty =
    !isLoadingInitialData && !!data?.[0] && (data[0].list?.length ?? 0) === 0

  const pageSize = data?.[0]?.list?.length || 0
  const total = data?.[0]?.total ?? 0
  const totalText = data?.[0]?.totalText
  const estimatedPages =
    mode === 'popular' ? 1 : estimateListPageCount(total, pageSize)

  const hasPrev = viewPage > 0
  const hasNext =
    mode !== 'popular' &&
    !!current &&
    (viewPage + 1 < pageCountLoaded || !!current.next)

  const isReachingEnd =
    firstEmpty ||
    mode === 'popular' ||
    (!!current && !current.next && viewPage + 1 >= pageCountLoaded)

  const goNext = useCallback(async () => {
    setJumpError(null)
    if (viewPage + 1 < pageCountLoaded) {
      setViewPage(viewPage + 1)
      return
    }
    if (!current?.next || mode === 'popular') return
    const nextIndex = viewPage + 1
    const gen = ++jumpGen.current
    setJumping(true)
    try {
      await setSize(nextIndex + 1)
      if (jumpGen.current === gen) setViewPage(nextIndex)
    } finally {
      if (jumpGen.current === gen) setJumping(false)
    }
  }, [viewPage, pageCountLoaded, current, mode, setSize])

  const goPrev = useCallback(() => {
    setJumpError(null)
    if (viewPage > 0) setViewPage(viewPage - 1)
  }, [viewPage])

  const goToPage = useCallback(
    async (page1Based: number) => {
      setJumpError(null)
      if (mode === 'popular') return
      if (!Number.isFinite(page1Based) || page1Based < 1) {
        setJumpError('invalid')
        return
      }
      const target = Math.floor(page1Based) - 1
      if (estimatedPages != null && target >= estimatedPages) {
        // clamp to last estimated page
        if (estimatedPages >= 1 && target > estimatedPages - 1) {
          // still allow; site totals are approximate ("about N")
        }
      }
      if (target < pageCountLoaded) {
        setViewPage(target)
        return
      }
      const from = Math.max(0, pageCountLoaded - 1)
      if (target - from > LIST_JUMP_MAX_WALK) {
        setJumpError('tooFar')
        return
      }
      const gen = ++jumpGen.current
      setJumping(true)
      try {
        let loaded = pageCountLoaded
        if (loaded === 0) {
          const pages = (await setSize(1)) as GalleriesPage[] | undefined
          loaded = pages?.length ?? 0
          if (!loaded) return
        }
        while (loaded - 1 < target) {
          if (jumpGen.current !== gen) return
          const prevPage = data?.[loaded - 1]
          // When walking, rely on setSize to use the previous page's next
          // from SWR cache (not the possibly-stale closure `data`).
          const pages = (await setSize(loaded + 1)) as
            | GalleriesPage[]
            | undefined
          if (!pages || pages.length <= loaded) {
            setJumpError('end')
            setViewPage(Math.max(0, (pages?.length ?? 1) - 1))
            return
          }
          const justFetched = pages[loaded]
          const previous = pages[loaded - 1]
          if (!previous?.next && loaded - 1 < target) {
            setJumpError('end')
            setViewPage(loaded - 1)
            return
          }
          if (!justFetched) {
            setJumpError('end')
            setViewPage(loaded - 1)
            return
          }
          loaded = pages.length
          void prevPage
        }
        if (jumpGen.current === gen) setViewPage(target)
      } finally {
        if (jumpGen.current === gen) setJumping(false)
      }
    },
    [mode, estimatedPages, pageCountLoaded, setSize, data]
  )

  return {
    dataSource,
    isEmpty: firstEmpty,
    isReachingEnd,
    isLoadingInitialData,
    isLoadingMore,
    error,
    viewPage,
    page: viewPage + 1,
    pageSize,
    total,
    totalText,
    estimatedPages,
    hasNext,
    hasPrev,
    goNext,
    goPrev,
    goToPage,
    jumping,
    jumpError,
    canPaginate: mode !== 'popular',
  }
}
