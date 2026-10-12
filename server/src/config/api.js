/**
 * Upstream site config.
 *
 * Default site is e-hentai (public, anonymous OK). Override with EHV_SITE
 * (exhentai | e-hentai) or per-request via X-EHV-Site / ehv_site cookie.
 * Runtime selection is preferred over rebuilding the image.
 */
const { AsyncLocalStorage } = require('async_hooks')

const SITES = {
  exhentai: {
    baseURL: 'https://exhentai.org',
    apiURL: 'https://s.exhentai.org/api.php',
    requiresLogin: true,
  },
  'e-hentai': {
    baseURL: 'https://e-hentai.org',
    apiURL: 'https://api.e-hentai.org/api.php',
    requiresLogin: false,
  },
}

const SITE_IDS = Object.keys(SITES)
const DEFAULT_SITE = 'e-hentai'
const loginURL = 'https://forums.e-hentai.org/index.php'

const siteStore = new AsyncLocalStorage()

function normalizeSiteName(raw) {
  if (typeof raw !== 'string') return null
  const name = raw.trim().toLowerCase()
  return SITES[name] ? name : null
}

/** Env default when the client does not send a preference */
function envSiteName() {
  return normalizeSiteName(process.env.EHV_SITE) || DEFAULT_SITE
}

function buildSiteConfig(siteName) {
  const name = normalizeSiteName(siteName) || envSiteName()
  const site = SITES[name]
  const baseURL = site.baseURL
  return {
    siteName: name,
    requiresLogin: site.requiresLogin,
    baseURL,
    baseApiURL: site.apiURL,
    loginURL,
    configURL: baseURL + '/uconfig.php',
    popularURL: baseURL + '/popular',
    watchedURL: baseURL + '/watched',
    favoritesURL: baseURL + '/favorites.php',
    favoritesApiURL: baseURL + '/gallerypopups.php',
    gallerytorrentsURL: baseURL + '/gallerytorrents.php',
  }
}

function getSiteConfig(siteName) {
  return buildSiteConfig(siteName)
}

/**
 * Resolve site for an HTTP request: X-EHV-Site header, then ehv_site cookie,
 * then EHV_SITE / default.
 */
function resolveSiteNameFromReq(req) {
  if (!req) return envSiteName()
  const header =
    (req.get && req.get('x-ehv-site')) ||
    (req.headers && (req.headers['x-ehv-site'] || req.headers['X-EHV-Site']))
  const fromHeader = normalizeSiteName(header)
  if (fromHeader) return fromHeader
  const fromCookie = req.cookies && normalizeSiteName(req.cookies.ehv_site)
  if (fromCookie) return fromCookie
  return envSiteName()
}

function resolveSiteFromReq(req) {
  return getSiteConfig(resolveSiteNameFromReq(req))
}

/** Request-scoped site (middleware); falls back to env default */
function getSite() {
  return siteStore.getStore() || getSiteConfig()
}

function runWithSite(site, fn) {
  return siteStore.run(site, fn)
}

// Boot-time / test helpers: same shape as the old module exports
const boot = getSiteConfig()

module.exports = {
  SITES,
  SITE_IDS,
  DEFAULT_SITE,
  loginURL,
  normalizeSiteName,
  envSiteName,
  getSiteConfig,
  resolveSiteNameFromReq,
  resolveSiteFromReq,
  getSite,
  runWithSite,
  // backward-compatible static defaults (env at process start)
  siteName: boot.siteName,
  requiresLogin: boot.requiresLogin,
  baseApiURL: boot.baseApiURL,
  baseURL: boot.baseURL,
  configURL: boot.configURL,
  popularURL: boot.popularURL,
  watchedURL: boot.watchedURL,
  favoritesURL: boot.favoritesURL,
  favoritesApiURL: boot.favoritesApiURL,
  gallerytorrentsURL: boot.gallerytorrentsURL,
}
