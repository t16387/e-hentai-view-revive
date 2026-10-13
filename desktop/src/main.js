/**
 * EHentaiView Electron shell
 *
 * Loads the running Next/Express app (Docker or bare Node) at EHV_APP_URL
 * (default http://127.0.0.1:3000). Sign In opens an in-window BrowserView
 * against forums.e-hentai.org; session.cookies are harvested when
 * ipb_member_id + ipb_pass_hash appear (EhViewer / JHenTai pattern).
 */
const path = require('path')
const {
  app,
  BrowserWindow,
  BrowserView,
  ipcMain,
  session,
  globalShortcut,
} = require('electron')
const {
  EH_COOKIE_DOMAINS,
  EH_FORUMS_LOGIN_URL,
  EH_EXHENTAI_URL,
  hasRequiredEhCookies,
  mergeCookieLists,
} = require('./cookieHelpers')

const APP_URL = (
  process.env.EHV_APP_URL ||
  process.env.EHV_DESKTOP_URL ||
  'http://127.0.0.1:3000'
).replace(/\/$/, '')

const LOGIN_PARTITION = 'persist:ehv-login'
const TOOLBAR_HEIGHT = 48
const POLL_MS = 800
const IGNEOUS_WAIT_MS = 4500

/** @type {BrowserWindow | null} */
let mainWindow = null
/** @type {BrowserView | null} */
let loginView = null
/** @type {BrowserView | null} */
let toolbarView = null
/** @type {ReturnType<typeof setInterval> | null} */
let pollTimer = null
/** @type {boolean} */
let capturing = false
/** @type {boolean} */
let igneousAttempted = false
/** @type {((...args: any[]) => void) | null} */
let cookieChangedHandler = null

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 900,
    minHeight: 600,
    title: 'EHentaiView',
    backgroundColor: '#121212',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: false,
      spellcheck: false,
    },
  })

  mainWindow.loadURL(APP_URL)

  mainWindow.webContents.on('did-finish-load', () => {
    maybeInjectFallbackSignIn(mainWindow)
  })
  mainWindow.webContents.on('did-navigate-in-page', () => {
    maybeInjectFallbackSignIn(mainWindow)
  })

  mainWindow.on('closed', () => {
    teardownLoginView()
    mainWindow = null
  })

  mainWindow.on('resize', () => {
    layoutLoginViews()
  })
}

/**
 * If the loaded app build predates WebViewLogin.tsx, inject a floating CTA
 * that uses preload IPC + fetch('/api/user/login'). Harmless no-op when the
 * React button (#open-webview-login) is already present.
 */
function maybeInjectFallbackSignIn(win) {
  if (!win || win.isDestroyed()) return
  const url = win.webContents.getURL() || ''
  if (!/\/signin\b/i.test(url)) return
  win.webContents
    .executeJavaScript(
      `(() => {
        if (document.getElementById('open-webview-login')) return 'react';
        if (document.getElementById('ehv-electron-fallback-login')) return 'fallback';
        if (!window.electronAPI || !window.electronAPI.openLoginWebView) return 'no-api';
        const bar = document.createElement('div');
        bar.id = 'ehv-electron-fallback-login';
        bar.style.cssText = 'position:fixed;z-index:99999;left:12px;right:12px;bottom:12px;padding:12px 16px;border-radius:10px;background:#1b5e20;color:#fff;display:flex;gap:12px;align-items:center;justify-content:space-between;font:14px system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.4)';
        bar.innerHTML = '<span>Electron: sign in with in-app WebView (cookies captured automatically)</span>';
        const btn = document.createElement('button');
        btn.textContent = 'Sign in with WebView';
        btn.style.cssText = 'appearance:none;border:0;border-radius:8px;padding:10px 16px;font-weight:600;cursor:pointer;background:#fff;color:#1b5e20';
        btn.onclick = async () => {
          btn.disabled = true;
          try { await window.electronAPI.openLoginWebView(); } catch (e) { btn.disabled = false; alert(String(e && e.message || e)); }
        };
        bar.appendChild(btn);
        document.body.appendChild(bar);
        if (!window.__ehvFallbackCookieHook) {
          window.__ehvFallbackCookieHook = true;
          window.electronAPI.onLoginCookies(async (cookies) => {
            try {
              const res = await fetch('/api/user/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-EHV-CSRF': '1' },
                credentials: 'same-origin',
                body: JSON.stringify({ method: 'cookie', ...cookies }),
              });
              const data = await res.json();
              if (data && !data.error) { location.href = '/'; }
              else { alert((data && data.message) || 'Login failed'); btn.disabled = false; }
            } catch (e) { alert(String(e && e.message || e)); btn.disabled = false; }
          });
        }
        return 'injected';
      })()`,
      true
    )
    .catch(() => {})
}

function loginSession() {
  return session.fromPartition(LOGIN_PARTITION)
}

async function readEhCookiesFromSession() {
  const ses = loginSession()
  const lists = await Promise.all(
    EH_COOKIE_DOMAINS.map((domain) =>
      ses.cookies.get({ domain }).catch(() => [])
    )
  )
  const all = await ses.cookies.get({}).catch(() => [])
  const filtered = (all || []).filter((c) => {
    const d = (c.domain || '').replace(/^\./, '')
    return (
      d === 'e-hentai.org' ||
      d.endsWith('.e-hentai.org') ||
      d === 'exhentai.org' ||
      d.endsWith('.exhentai.org') ||
      d === 'forums.e-hentai.org'
    )
  })
  return mergeCookieLists(...lists, filtered)
}

function layoutLoginViews() {
  if (!mainWindow) return
  const [width, height] = mainWindow.getContentSize()
  if (toolbarView) {
    toolbarView.setBounds({ x: 0, y: 0, width, height: TOOLBAR_HEIGHT })
  }
  if (loginView) {
    loginView.setBounds({
      x: 0,
      y: TOOLBAR_HEIGHT,
      width,
      height: Math.max(0, height - TOOLBAR_HEIGHT),
    })
  }
}

function sendToRenderer(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload)
  }
}

function stopPoll() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

function teardownLoginView() {
  stopPoll()
  capturing = false
  igneousAttempted = false

  const ses = loginSession()
  if (cookieChangedHandler) {
    try {
      ses.cookies.removeListener('changed', cookieChangedHandler)
    } catch (_) {
      /* ignore */
    }
    cookieChangedHandler = null
  }

  const detach = (view) => {
    if (!view || !mainWindow || mainWindow.isDestroyed()) return
    try {
      mainWindow.removeBrowserView(view)
    } catch (_) {
      /* ignore */
    }
    try {
      if (view.webContents && !view.webContents.isDestroyed()) {
        view.webContents.close()
      }
    } catch (_) {
      /* ignore */
    }
  }

  detach(loginView)
  detach(toolbarView)
  loginView = null
  toolbarView = null

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setTitle('EHentaiView')
  }

  try {
    globalShortcut.unregister('Escape')
  } catch (_) {
    /* ignore */
  }
}

async function maybeFinishWithCookies(fields) {
  if (!capturing || !hasRequiredEhCookies(fields)) return

  if (!fields.igneous && !igneousAttempted && loginView) {
    igneousAttempted = true
    try {
      await loginView.webContents.loadURL(EH_EXHENTAI_URL)
    } catch (_) {
      /* continue with ipb_* only */
    }
    await new Promise((r) => setTimeout(r, IGNEOUS_WAIT_MS))
    const again = await readEhCookiesFromSession()
    if (again.igneous) fields = { ...fields, igneous: again.igneous }
    if (!hasRequiredEhCookies(fields)) return
  }

  capturing = false
  stopPoll()
  const payload = {
    ipb_member_id: fields.ipb_member_id,
    ipb_pass_hash: fields.ipb_pass_hash,
    ...(fields.igneous ? { igneous: fields.igneous } : {}),
  }
  sendToRenderer('ehv:login-cookies', payload)
  teardownLoginView()
}

function startCookiePoll() {
  stopPoll()
  pollTimer = setInterval(async () => {
    if (!capturing) return
    try {
      const fields = await readEhCookiesFromSession()
      await maybeFinishWithCookies(fields)
    } catch (_) {
      /* keep polling */
    }
  }, POLL_MS)
}

function openLoginWebView() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return { ok: false, message: 'Main window is not ready' }
  }
  if (loginView) {
    layoutLoginViews()
    return { ok: true, alreadyOpen: true }
  }

  capturing = true
  igneousAttempted = false

  const ses = loginSession()

  toolbarView = new BrowserView({
    webPreferences: {
      preload: path.join(__dirname, 'toolbarPreload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  toolbarView.webContents.loadFile(path.join(__dirname, 'toolbar.html'))

  loginView = new BrowserView({
    webPreferences: {
      session: ses,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  // z-order: add toolbar last so it stays on top of the guest view
  mainWindow.addBrowserView(loginView)
  mainWindow.addBrowserView(toolbarView)
  layoutLoginViews()
  mainWindow.setTitle('EHentaiView — Sign in (WebView)')

  loginView.webContents.setWindowOpenHandler(({ url }) => {
    // Keep forums / CF flows inside the same guest view
    try {
      loginView.webContents.loadURL(url)
    } catch (_) {
      /* ignore */
    }
    return { action: 'deny' }
  })

  loginView.webContents.on('did-fail-load', (_e, code, desc, url, isMain) => {
    if (!isMain || code === -3) return
    sendToRenderer('ehv:login-webview-event', {
      reason: 'load-failed',
      message: `Failed to load login page (${code}): ${desc}`,
      url,
    })
  })

  cookieChangedHandler = async () => {
    if (!capturing) return
    try {
      const fields = await readEhCookiesFromSession()
      await maybeFinishWithCookies(fields)
    } catch (_) {
      /* ignore */
    }
  }
  ses.cookies.on('changed', cookieChangedHandler)

  loginView.webContents.loadURL(EH_FORUMS_LOGIN_URL)
  startCookiePoll()

  try {
    globalShortcut.register('Escape', () => {
      if (loginView) closeLoginWebView('cancelled')
    })
  } catch (_) {
    /* shortcut may fail if already taken */
  }

  sendToRenderer('ehv:login-webview-event', { reason: 'opened' })
  return { ok: true }
}

function closeLoginWebView(reason = 'cancelled') {
  const wasOpen = !!loginView
  teardownLoginView()
  if (wasOpen) {
    sendToRenderer('ehv:login-webview-event', { reason })
  }
  return { ok: true }
}

function isAllowedLoginHost(hostname) {
  return (
    hostname === 'forums.e-hentai.org' ||
    hostname === 'e-hentai.org' ||
    hostname.endsWith('.e-hentai.org') ||
    hostname === 'exhentai.org' ||
    hostname.endsWith('.exhentai.org') ||
    hostname.endsWith('.cloudflare.com') ||
    hostname === 'challenges.cloudflare.com'
  )
}

app.whenReady().then(() => {
  createMainWindow()

  ipcMain.handle('ehv:open-login-webview', async () => openLoginWebView())
  ipcMain.handle('ehv:close-login-webview', async () =>
    closeLoginWebView('cancelled')
  )

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  teardownLoginView()
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  try {
    globalShortcut.unregisterAll()
  } catch (_) {
    /* ignore */
  }
})

app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (e, url) => {
    const isLoginGuest = loginView && contents === loginView.webContents
    if (isLoginGuest) {
      try {
        const host = new URL(url).hostname
        if (!isAllowedLoginHost(host)) e.preventDefault()
      } catch (_) {
        e.preventDefault()
      }
      return
    }
    if (toolbarView && contents === toolbarView.webContents) {
      e.preventDefault()
      return
    }
    // Main shell: stay on the configured app origin
    if (mainWindow && contents === mainWindow.webContents) {
      try {
        const allowed = new URL(APP_URL)
        const next = new URL(url)
        if (next.origin !== allowed.origin) e.preventDefault()
      } catch (_) {
        e.preventDefault()
      }
    }
  })
})
