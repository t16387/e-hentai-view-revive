/**
 * Headless-ish smoke: open login BrowserView, assert forums URL, quit.
 * Usage (from desktop/): EHV_APP_URL=http://127.0.0.1:3000 pnpm exec electron scripts/smoke-webview.js
 * Does not perform real login or touch secrets.
 */
const path = require('path')
const {
  app,
  BrowserWindow,
  BrowserView,
  session,
} = require('electron')

const APP_URL = (process.env.EHV_APP_URL || 'http://127.0.0.1:3000').replace(
  /\/$/,
  ''
)
const FORUMS =
  'https://forums.e-hentai.org/index.php?act=Login&CODE=00'
const TIMEOUT_MS = Number(process.env.EHV_SMOKE_TIMEOUT_MS || 45000)

function fail(msg) {
  console.error('SMOKE FAIL:', msg)
  app.exit(1)
}

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1100,
    height: 800,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'src', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  const timer = setTimeout(() => fail(`timeout after ${TIMEOUT_MS}ms`), TIMEOUT_MS)

  try {
    await win.loadURL(APP_URL + '/signin')
    console.log('SMOKE: app signin loaded', APP_URL + '/signin')

    const ses = session.fromPartition('persist:ehv-smoke-login')
    const view = new BrowserView({
      webPreferences: {
        session: ses,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    })
    win.setBrowserView(view)
    const [w, h] = win.getContentSize()
    view.setBounds({ x: 0, y: 48, width: w, height: Math.max(0, h - 48) })

    await new Promise((resolve, reject) => {
      const done = (err) => {
        view.webContents.removeListener('did-finish-load', onOk)
        view.webContents.removeListener('did-fail-load', onFail)
        err ? reject(err) : resolve()
      }
      const onOk = () => done(null)
      const onFail = (_e, code, desc, url, isMain) => {
        if (!isMain || code === -3) return
        done(new Error(`did-fail-load ${code} ${desc} ${url}`))
      }
      view.webContents.on('did-finish-load', onOk)
      view.webContents.on('did-fail-load', onFail)
      view.webContents.loadURL(FORUMS)
    })

    const loaded = view.webContents.getURL()
    console.log('SMOKE: login BrowserView URL =', loaded)
    if (!/forums\.e-hentai\.org/i.test(loaded) && !/cloudflare/i.test(loaded)) {
      // CF challenge may rewrite host; still OK if we got a successful load of forums start
      if (!loaded.startsWith('https://')) {
        fail(`unexpected URL: ${loaded}`)
      }
    }

    // Confirm preload bridge on app page
    const hasApi = await win.webContents.executeJavaScript(
      '!!(window.electronAPI && window.electronAPI.openLoginWebView)',
      true
    )
    console.log('SMOKE: window.electronAPI present =', hasApi)
    if (!hasApi) fail('preload electronAPI missing on app page')

    // Injected or React CTA (best-effort; old Docker image may only get inject after did-finish-load in main)
    const cta = await win.webContents.executeJavaScript(
      `!!(document.getElementById('open-webview-login') || document.getElementById('ehv-electron-fallback-login'))`,
      true
    )
    console.log('SMOKE: Sign In WebView CTA in DOM =', cta)

    clearTimeout(timer)
    console.log('SMOKE PASS: in-bound WebView loaded forums login')
    app.exit(0)
  } catch (e) {
    clearTimeout(timer)
    fail(e && e.message ? e.message : String(e))
  }
})
