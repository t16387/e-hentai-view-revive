/**
 * Detect the EHentaiView Electron shell and talk to preload IPC.
 * Safe no-ops when running in a normal browser.
 */

export type EhLoginCookies = {
  ipb_member_id: string
  ipb_pass_hash: string
  igneous?: string
}

export type LoginWebViewEvent = {
  reason: string
  message?: string
  url?: string
}

export type ElectronAPI = {
  isElectron: true
  openLoginWebView: () => Promise<{
    ok: boolean
    alreadyOpen?: boolean
    message?: string
  }>
  closeLoginWebView: () => Promise<{ ok: boolean }>
  onLoginCookies: (cb: (cookies: EhLoginCookies) => void) => () => void
  onLoginWebViewEvent: (cb: (payload: LoginWebViewEvent) => void) => () => void
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

/** True when preload exposed window.electronAPI (Electron shell). */
export function isElectronShell(): boolean {
  if (typeof window === 'undefined') return false
  if (window.electronAPI && window.electronAPI.isElectron) return true
  // Fallback: Chromium embedded in Electron often includes "Electron" in UA
  try {
    return /\bElectron\//i.test(window.navigator.userAgent)
  } catch (_) {
    return false
  }
}

/** Prefer the typed preload bridge; null in plain browsers. */
export function getElectronAPI(): ElectronAPI | null {
  if (typeof window === 'undefined') return null
  const api = window.electronAPI
  if (api && api.isElectron && typeof api.openLoginWebView === 'function') {
    return api
  }
  return null
}
