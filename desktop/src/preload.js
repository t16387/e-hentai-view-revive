/**
 * Secure preload: contextIsolation + no nodeIntegration.
 * Exposes a minimal electronAPI for Sign In WebView IPC only.
 */
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  /** true when running inside the EHentaiView Electron shell */
  isElectron: true,

  /**
   * Open the in-window login BrowserView (forums.e-hentai.org).
   * Resolves when the main process acknowledges the open request.
   */
  openLoginWebView: () => ipcRenderer.invoke('ehv:open-login-webview'),

  /** Close / cancel the login BrowserView if open */
  closeLoginWebView: () => ipcRenderer.invoke('ehv:close-login-webview'),

  /**
   * Subscribe to captured session cookies after successful forums login.
   * @param {(cookies: { ipb_member_id: string, ipb_pass_hash: string, igneous?: string }) => void} cb
   * @returns {() => void} unsubscribe
   */
  onLoginCookies: (cb) => {
    if (typeof cb !== 'function') return () => {}
    const handler = (_event, cookies) => {
      cb(cookies)
    }
    ipcRenderer.on('ehv:login-cookies', handler)
    return () => {
      ipcRenderer.removeListener('ehv:login-cookies', handler)
    }
  },

  /**
   * Subscribe to login WebView errors / cancel.
   * @param {(payload: { reason: string, message?: string }) => void} cb
   * @returns {() => void}
   */
  onLoginWebViewEvent: (cb) => {
    if (typeof cb !== 'function') return () => {}
    const handler = (_event, payload) => {
      cb(payload)
    }
    ipcRenderer.on('ehv:login-webview-event', handler)
    return () => {
      ipcRenderer.removeListener('ehv:login-webview-event', handler)
    }
  },
})
