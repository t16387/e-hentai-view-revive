const axios = require('../axios')
const { getSite } = require('../config/api')
const { fetchPage } = require('../utils/fetchPage')
const { listFromDocument } = require('../gallery/listPage')
const { parseFavoritesSettingInfo } = require('./favoritesPaeser')
const qs = require('qs')
const { GalleryMode } = require('../constant')
async function getFavorites(params, cookies) {
  const { favoritesURL, siteName } = getSite()
  // the parser detects the display mode; no second request with inline_set
  const { document } = await fetchPage(favoritesURL, {
    cookies,
    params,
    siteName,
  })
  return listFromDocument(document, GalleryMode.Favorites)
}

async function getFavoritesInfo(cookies) {
  const { favoritesURL, siteName } = getSite()
  const { document } = await fetchPage(favoritesURL, { cookies, siteName })
  return await parseFavoritesSettingInfo(document)
}

async function updateFavorite({ gid, token, favcat }, cookies) {
  const { favoritesApiURL } = getSite()
  await axios.request({
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookies,
    },
    method: 'POST',
    url: favoritesApiURL,
    params: { gid, t: token, act: 'addfav' },
    data: qs.stringify({
      favcat,
      favnote: '',
      update: 1,
    }),
  })
}

module.exports = { getFavorites, getFavoritesInfo, updateFavorite }
