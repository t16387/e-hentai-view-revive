import { LOCAL_SHOW_DOWNLOADS_NAV } from '@/constant'

/**
 * Whether the Downloads item appears in bottom/desktop nav.
 * Stored as the string "true" / "false" (not JSON), same pattern as
 * doNotStoreHistory. Default: true (feature visible until the user hides it).
 */
export function readShowDownloadsNav(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const v = window.localStorage.getItem(LOCAL_SHOW_DOWNLOADS_NAV)
    if (v === null) return true
    return v === 'true'
  } catch {
    return true
  }
}

export function writeShowDownloadsNav(on: boolean) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LOCAL_SHOW_DOWNLOADS_NAV, on ? 'true' : 'false')
  } catch {
    // quota / private mode — ignore
  }
}
