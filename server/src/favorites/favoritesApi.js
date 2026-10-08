const axios = require('../axios')
const { favoritesURL, favoritesApiURL } = require('../config/api')
const JSDOM = require('jsdom').JSDOM
const { parseGalleryList } = require('../gallery/galleryParser')
const { parseFavoritesSettingInfo } = require('./favoritesPaeser')
const qs = require('qs')
const { GalleryMode } = require('../constant')
async function getFavorites(params, cookies) {
  // the parser detects the display mode; no second request with inline_set
  const res = await axios.get(`${favoritesURL}`, {
    params,
    headers: { Cookie: cookies },
  })

  const document = new JSDOM(res.data).window.document

  if (document.body.innerHTML.includes('No hits found')) {
    return { list: [], total: 0, next: null, prev: null }
  }

  const { list, total, next, prev } = parseGalleryList(
    document,
    GalleryMode.Favorites
  )
  return { list, total, next, prev }
}

async function getFavoritesInfo(cookies) {
  const res = await axios.get(favoritesURL, { headers: { Cookie: cookies } })
  const document = new JSDOM(res.data).window.document
  return await parseFavoritesSettingInfo(document)
}

async function updateFavorite({ gid, token, favcat }, cookies) {
  await axios({
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
