import { LOCAL_DO_NOT_STORE_HISTORY } from '@/constant'

/**
 * Read the "do not store history" preference from localStorage.
 * Stored as the string "true" / "false" (not JSON). Existing browse/read
 * history is left untouched until the user clears it.
 */
export function readDoNotStoreHistory(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(LOCAL_DO_NOT_STORE_HISTORY) === 'true'
  } catch {
    return false
  }
}

export function writeDoNotStoreHistory(on: boolean) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(
      LOCAL_DO_NOT_STORE_HISTORY,
      on ? 'true' : 'false'
    )
  } catch {
    // quota / private mode — ignore
  }
}
