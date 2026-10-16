import { LOCAL_COMIC_READ_PAGE_HISTORY, LOCAL_HISTORY } from '@/constant'

/**
 * Clear browse/watch history and comic read-page progress from localStorage.
 * Does not touch search query history, cookies, downloads, or server cache.
 */
export function clearWatchHistory(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(LOCAL_HISTORY)
    window.localStorage.removeItem(LOCAL_COMIC_READ_PAGE_HISTORY)
  } catch {
    // quota / private mode — ignore
  }
}
