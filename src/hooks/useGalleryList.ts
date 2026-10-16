import { axios } from '@/apis'
import { GalleriesPage, IndexListItemPorps } from '@/interface/gallery'
import {
  GalleryListMode,
  LIST_JUMP_MAX_WALK,
  SearchFilters,
  clearJumpingOnCancel,
  clampListJumpTarget,
  galleryListKey,
  lastNonEmptyListIndex,
  mergeListPagerQuery,
  readListPagerQuery,
  resolveListEstimatedPages,
  shouldMarkListEnd,
} from '@/utils/search'
import { useRouter } from 'next/router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSWRInfinite } from 'swr'

/** Max EH pages to skip when a cursor page is empty after filters. */
export const LIST_EMPTY_SKIP_MAX = 25

export interface UseGalleryListOptions extends SearchFilters {
  mode: GalleryListMode
}

export default function useGalleryList(options: UseGalleryListOptions) {
  const { mode, ...filters } = options
  const router = useRouter()
  const initialPager = router.isReady
    ? readListPagerQuery(
        router.query as Record<string, string | string[] | undefined>
      )
    : { viewPage: 0, knownLastIndex: null as number | null }
  const [viewPage, setViewPage] = useState(initialPager.viewPage)
  const [jumping, setJumping] = useState(false)
  const [jumpError, setJumpError] = useState<string | null>(null)
  /** When the cursor chain ends before EH's approximate total, clamp UI. */
  const [knownLastIndex, setKnownLastIndex] = useState<number | null>(
    initialPager.knownLastIndex
  )
  const jumpGen = useRef(0)
  /** After remount/back, walk cursors up to this 0-based index once data exists. */
  const pendingRestore = useRef<number | null>(
    initialPager.viewPage > 0 ? initialPager.viewPage : null
  )
  const skipUrlSync = useRef(false)

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

  // Reset / restore when filters change or list remounts (gallery → Back).
  useEffect(() => {
    if (!router.isReady) return
    setJumpError(null)
    clearJumpingOnCancel(jumpGen, setJumping)

    const { viewPage: restoredPage, knownLastIndex: restoredLast } =
      readListPagerQuery(router.query)

    skipUrlSync.current = true
    if (restoredPage > 0 || restoredLast != null) {
      setViewPage(restoredPage)
      setKnownLastIndex(restoredLast)
      pendingRestore.current = restoredPage > 0 ? restoredPage : null
    } else {
      setViewPage(0)
      setKnownLastIndex(null)
      pendingRestore.current = null
    }
    setSize(1)
    // Intentionally omit router.query: only re-read on filter/remount, not every shallow page= write.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterIdentity, setSize, router.isReady])

  // Persist pager position in the URL so Back from a gallery remounts at N/N.
  useEffect(() => {
    if (!router.isReady) return
    if (skipUrlSync.current) {
      skipUrlSync.current = false
      return
    }
    const merged = mergeListPagerQuery(
      router.query as Record<string, string | string[] | undefined>,
      viewPage,
      knownLastIndex
    )
    const cur = readListPagerQuery(
      router.query as Record<string, string | string[] | undefined>
    )
    if (cur.viewPage === viewPage && cur.knownLastIndex === knownLastIndex) {
      return
    }
    router.replace(
      { pathname: router.pathname, query: merged as typeof router.query },
      undefined,
      { shallow: true }
    )
    // Intentionally omit full router: replace when pager state changes only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewPage, knownLastIndex, router.isReady, router.pathname])

  const pageCountLoaded = data?.length ?? 0
  const current = data?.[viewPage]
  const dataSource: IndexListItemPorps[] = current?.list ?? []
  const isLoadingInitialData = !data && !error
  // If size grew past loaded pages but the request errored, do not keep
  // controls disabled forever (waitingOnPage would otherwise stay true).
  const waitingOnPage =
    !error && size > 0 && data && typeof data[size - 1] === 'undefined'
  const isLoadingMore = isLoadingInitialData || !!waitingOnPage || jumping

  // Soft-fail safety: never leave SWR size > successfully loaded pages.
  useEffect(() => {
    if (!error) return
    const loaded = data?.length ?? 0
    if (size > loaded) {
      void setSize(Math.max(1, loaded || 1))
    }
  }, [error, size, data?.length, setSize])

  const firstEmpty =
    !isLoadingInitialData && !!data?.[0] && (data[0].list?.length ?? 0) === 0

  const rawPageSize = data?.[0]?.list?.length || 0
  const total = data?.[0]?.total ?? 0
  const totalText = data?.[0]?.totalText
  const lastLoaded = data?.[pageCountLoaded - 1]
  const effectiveEstimated = resolveListEstimatedPages({
    mode,
    total,
    rawPageSize,
    pageCountLoaded,
    lastHasNext: !!lastLoaded?.next,
    knownLastIndex,
    currentPage: viewPage + 1,
  })

  // Drop stale knownLast from URL when chain clearly continues past it.
  useEffect(() => {
    if (knownLastIndex == null) return
    if (pageCountLoaded > knownLastIndex + 1) {
      setKnownLastIndex(null)
      return
    }
    if (knownLastIndex < pageCountLoaded && !!data?.[knownLastIndex]?.next) {
      setKnownLastIndex(null)
      return
    }
    if (viewPage > knownLastIndex && !!lastLoaded?.next) {
      setKnownLastIndex(null)
    }
  }, [knownLastIndex, pageCountLoaded, viewPage, lastLoaded?.next, data])

  // After jump/end on a blank page, snap to the last non-empty so Back
  // does not show stacked pagers around an empty grid.
  useEffect(() => {
    if (jumping || isLoadingMore || isLoadingInitialData) return
    if (!data?.length) return
    const cur = data[viewPage]
    if (!cur) return
    if ((cur.list?.length ?? 0) > 0) return
    if (cur.next) return
    const snap = lastNonEmptyListIndex(data, viewPage)
    if (snap !== viewPage) setViewPage(snap)
  }, [data, viewPage, jumping, isLoadingMore, isLoadingInitialData])

  const hasPrev = viewPage > 0
  const hasNext =
    mode !== 'popular' &&
    !!current &&
    (viewPage + 1 < pageCountLoaded || !!current.next)

  const isReachingEnd =
    firstEmpty ||
    mode === 'popular' ||
    (!!current && !current.next && viewPage + 1 >= pageCountLoaded)

  const markEnd = useCallback((lastIndex: number) => {
    setKnownLastIndex((prev) =>
      prev == null ? lastIndex : Math.min(prev, lastIndex)
    )
  }, [])

  /** Reset SWR size to loaded pages so waitingOnPage cannot stick. */
  const resetSizeToLoaded = useCallback(
    (pages: GalleriesPage[] | undefined, fallbackLen: number) => {
      const n = Math.max(1, pages?.length ?? fallbackLen)
      void setSize(n)
    },
    [setSize]
  )

  /**
   * After loading `pages`, advance past empty filtered EH pages (list=[])
   * while `next` remains, up to LIST_EMPTY_SKIP_MAX. Returns the index to
   * show, or -1 if the chain ended.
   */
  const skipEmptyForward = useCallback(
    async (
      pages: GalleriesPage[],
      startIndex: number,
      gen: number
    ): Promise<{
      pages: GalleriesPage[]
      index: number
      ended: boolean
      loadFailed?: boolean
    }> => {
      let loaded = pages
      let idx = startIndex
      let skips = 0
      while (
        idx < loaded.length &&
        (loaded[idx]?.list?.length ?? 0) === 0 &&
        loaded[idx]?.next &&
        skips < LIST_EMPTY_SKIP_MAX
      ) {
        if (jumpGen.current !== gen) {
          return { pages: loaded, index: idx, ended: false }
        }
        skips++
        const nextLen = loaded.length + 1
        const grown = (await setSize(nextLen)) as GalleriesPage[] | undefined
        if (!grown || grown.length <= loaded.length) {
          // Soft failure — do not markEnd; reset size so controls unlock.
          resetSizeToLoaded(grown ?? loaded, loaded.length)
          return {
            pages: grown ?? loaded,
            index: lastNonEmptyListIndex(
              grown ?? loaded,
              Math.max(0, (grown?.length ?? loaded.length) - 1)
            ),
            ended: false,
            loadFailed: true,
          }
        }
        loaded = grown
        idx = loaded.length - 1
      }
      if (
        idx < loaded.length &&
        (loaded[idx]?.list?.length ?? 0) === 0 &&
        shouldMarkListEnd({ next: loaded[idx]?.next, grew: true })
      ) {
        markEnd(idx)
        const snap = lastNonEmptyListIndex(loaded, idx)
        return { pages: loaded, index: snap, ended: true }
      }
      return { pages: loaded, index: idx, ended: false }
    },
    [setSize, markEnd, resetSizeToLoaded]
  )

  const goNext = useCallback(async () => {
    setJumpError(null)
    if (viewPage + 1 < pageCountLoaded) {
      const nextIdx = viewPage + 1
      const nextPage = data?.[nextIdx]
      if (nextPage && (nextPage.list?.length ?? 0) === 0 && nextPage.next) {
        const gen = ++jumpGen.current
        setJumping(true)
        try {
          const result = await skipEmptyForward(data ?? [], nextIdx, gen)
          if (jumpGen.current === gen) {
            setViewPage(result.index)
            if (result.loadFailed) setJumpError('loadFailed')
            else if (result.ended) setJumpError('end')
          }
        } finally {
          if (jumpGen.current === gen) setJumping(false)
        }
        return
      }
      setViewPage(nextIdx)
      return
    }
    if (!current?.next || mode === 'popular') return
    const nextIndex = viewPage + 1
    const gen = ++jumpGen.current
    setJumping(true)
    try {
      const pages = (await setSize(nextIndex + 1)) as
        | GalleriesPage[]
        | undefined
      if (!pages || pages.length <= nextIndex) {
        resetSizeToLoaded(pages, pageCountLoaded || viewPage + 1)
        setJumpError('loadFailed')
        return
      }
      const result = await skipEmptyForward(pages, nextIndex, gen)
      if (jumpGen.current === gen) {
        setViewPage(result.index)
        if (result.loadFailed) setJumpError('loadFailed')
        else if (result.ended) setJumpError('end')
      }
    } finally {
      if (jumpGen.current === gen) setJumping(false)
    }
  }, [
    viewPage,
    pageCountLoaded,
    current,
    mode,
    setSize,
    data,
    skipEmptyForward,
    resetSizeToLoaded,
  ])

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
      let target = Math.floor(page1Based) - 1

      // Stale knownLast: user Go's beyond it while that page still has next.
      let known = knownLastIndex
      if (known != null && known < pageCountLoaded && !!data?.[known]?.next) {
        setKnownLastIndex(null)
        known = null
      }

      const clamped = clampListJumpTarget(target, known)
      target = clamped.target
      if (clamped.clamped) setJumpError('end')
      // Site totals are "about N"; do not hard-clamp jumps to approxPages
      // until the cursor chain proves a shorter end.
      if (target < pageCountLoaded) {
        const at = data?.[target]
        if (at && (at.list?.length ?? 0) === 0 && at.next) {
          const gen = ++jumpGen.current
          setJumping(true)
          try {
            const result = await skipEmptyForward(data ?? [], target, gen)
            if (jumpGen.current === gen) {
              setViewPage(result.index)
              if (result.loadFailed) setJumpError('loadFailed')
              else if (result.ended) setJumpError('end')
            }
          } finally {
            if (jumpGen.current === gen) setJumping(false)
          }
          return
        }
        if (at && (at.list?.length ?? 0) === 0 && !at.next) {
          setViewPage(lastNonEmptyListIndex(data ?? [], target))
          return
        }
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
        let pages = data as GalleriesPage[] | undefined
        if (loaded === 0) {
          pages = (await setSize(1)) as GalleriesPage[] | undefined
          loaded = pages?.length ?? 0
          if (!loaded) {
            setJumpError('loadFailed')
            return
          }
        }
        while (loaded - 1 < target) {
          if (jumpGen.current !== gen) return
          // setSize appends using the previous page's next cursor from SWR.
          pages = (await setSize(loaded + 1)) as GalleriesPage[] | undefined
          if (!pages || pages.length <= loaded) {
            // Soft failure: do not markEnd / write last=; unlock controls.
            resetSizeToLoaded(pages, loaded)
            setJumpError('loadFailed')
            setViewPage(
              lastNonEmptyListIndex(
                pages ?? data ?? [],
                Math.max(0, loaded - 1)
              )
            )
            return
          }
          const justFetched = pages[loaded]
          const previous = pages[loaded - 1]
          if (
            shouldMarkListEnd({ next: previous?.next, grew: true }) &&
            loaded - 1 < target
          ) {
            markEnd(loaded - 1)
            setJumpError('end')
            setViewPage(lastNonEmptyListIndex(pages, loaded - 1))
            return
          }
          if (!justFetched) {
            resetSizeToLoaded(pages, loaded)
            setJumpError('loadFailed')
            setViewPage(lastNonEmptyListIndex(pages, loaded - 1))
            return
          }
          // Skip empty filtered pages while walking toward target so we do
          // not stop short or land on a blank EH page.
          if ((justFetched.list?.length ?? 0) === 0 && justFetched.next) {
            const skipped = await skipEmptyForward(pages, loaded, gen)
            pages = skipped.pages
            loaded = pages.length
            if (skipped.loadFailed) {
              setJumpError('loadFailed')
              setViewPage(skipped.index)
              return
            }
            if (skipped.ended) {
              setJumpError('end')
              setViewPage(skipped.index)
              return
            }
            // Cancelled mid-skip: abort so finally can clear when gen matches,
            // or leave jumping for a newer jump / cancelJumpingOnCancel.
            if (jumpGen.current !== gen) return
            continue
          }
          if (
            shouldMarkListEnd({
              next: justFetched.next,
              grew: true,
            }) &&
            (justFetched.list?.length ?? 0) === 0
          ) {
            markEnd(loaded)
            setJumpError('end')
            setViewPage(lastNonEmptyListIndex(pages, loaded))
            return
          }
          loaded = pages.length
        }
        if (jumpGen.current === gen) {
          // If the target page itself is empty, skip forward to content.
          const at = pages?.[target]
          if (at && (at.list?.length ?? 0) === 0 && at.next) {
            const skipped = await skipEmptyForward(pages!, target, gen)
            if (jumpGen.current === gen) {
              setViewPage(skipped.index)
              if (skipped.loadFailed) setJumpError('loadFailed')
              else if (skipped.ended) setJumpError('end')
            }
          } else if (at && (at.list?.length ?? 0) === 0 && !at.next) {
            markEnd(target)
            setJumpError('end')
            setViewPage(lastNonEmptyListIndex(pages ?? [], target))
          } else {
            setViewPage(target)
          }
        }
      } finally {
        if (jumpGen.current === gen) setJumping(false)
      }
    },
    [
      mode,
      pageCountLoaded,
      setSize,
      data,
      knownLastIndex,
      markEnd,
      skipEmptyForward,
      resetSizeToLoaded,
    ]
  )

  // After Back/restore: load cursor pages until the restored index has data.
  useEffect(() => {
    const target = pendingRestore.current
    if (target == null) return
    if (isLoadingInitialData || jumping) return
    if (!data?.length) return
    pendingRestore.current = null
    if (target < pageCountLoaded) {
      setViewPage(target)
      return
    }
    void goToPage(target + 1)
  }, [data, isLoadingInitialData, jumping, pageCountLoaded, goToPage])

  return {
    dataSource,
    isEmpty: firstEmpty,
    isReachingEnd,
    isLoadingInitialData,
    isLoadingMore,
    error,
    viewPage,
    page: viewPage + 1,
    pageSize: rawPageSize,
    total,
    totalText,
    estimatedPages: effectiveEstimated,
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
