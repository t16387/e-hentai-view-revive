/**
 * Upstream site. EHV_SITE=exhentai (default, needs a logged-in account)
 * or EHV_SITE=e-hentai (public site, works anonymously).
 */
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
const siteName = SITES[process.env.EHV_SITE] ? process.env.EHV_SITE : 'exhentai'
const site = SITES[siteName]

const baseURL = site.baseURL
const baseApiURL = site.apiURL

const loginURL = 'https://forums.e-hentai.org/index.php'
const configURL = baseURL + '/uconfig.php'
const popularURL = baseURL + '/popular'
const watchedURL = baseURL + '/watched'
const favoritesURL = baseURL + '/favorites.php'
const favoritesApiURL = baseURL + '/gallerypopups.php'
const gallerytorrentsURL = baseURL + '/gallerytorrents.php'
module.exports = {
  siteName,
  requiresLogin: site.requiresLogin,
  baseApiURL,
  baseURL,
  loginURL,
  configURL,
  popularURL,
  watchedURL,
  favoritesURL,
  favoritesApiURL,
  gallerytorrentsURL,
}
