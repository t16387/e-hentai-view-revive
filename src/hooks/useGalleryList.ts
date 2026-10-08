import { axios } from '@/apis'
import { GalleriesPage } from '@/interface/gallery'
import { galleryListKey, GalleryListMode } from '@/utils/search'
import { useEffect } from 'react'
import { useSWRInfinite } from 'swr'
import useInViewportWithDistance from './useInViewportWithDistance'

export interface UseGalleryListOptions {
  f_search?: string
  mode: GalleryListMode
  favcat?: string
}
export default function useGalleryList<T extends HTMLElement = HTMLDivElement>(
  options: UseGalleryListOptions
) {
  const { mode, f_search, favcat } = options
  const [inview, inviewRef] = useInViewportWithDistance<T>(600)
  // cursor pagination: each key is derived from the previous page's `next`
  const { data, error, size, setSize } = useSWRInfinite<GalleriesPage>(
    (pageIndex, previous: GalleriesPage | null) =>
      galleryListKey(mode, { f_search, favcat }, pageIndex, previous),
    async (url: string) => {
      const res = await axios.get<GalleriesPage>(url)
      if (res.data.error) throw res.data.message
      return res.data
    }
  )

  const dataSource = data ? data.flatMap((page) => page.list) : []
  const isLoadingInitialData = !data && !error
  const isLoadingMore =
    isLoadingInitialData ||
    (size > 0 && data && typeof data[size - 1] === 'undefined')
  const isEmpty = !isLoadingInitialData && dataSource.length === 0
  const lastPage = data ? data[data.length - 1] : undefined
  const isReachingEnd =
    isEmpty || mode === 'popular' || (!!lastPage && !lastPage.next)
  // const isRefreshing = isValidating && data && data.length === size

  useEffect(() => {
    if (inview && !isLoadingMore && !isReachingEnd) setSize((size) => size + 1)
  }, [inview, isLoadingMore, isReachingEnd, setSize, mode])

  return {
    dataSource,
    isEmpty,
    isReachingEnd,
    isLoadingInitialData,
    isLoadingMore,
    inviewRef,
    error,
  }
}
