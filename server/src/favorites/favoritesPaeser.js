const { parseSearchText } = require('../gallery/galleryParser')
/**
 * @param { Document } document
 */
function parseFavoritesSettingInfo(document) {
  const lists = document.querySelectorAll('.nosel [class=fp]')

  const { total } = parseSearchText(document)

  const res = Array.from(lists).map((favNode, index) => {
    const count = favNode.children[0].textContent
    const favName = favNode.children[2].textContent
    return { count, favName, index }
  })
  res.unshift({ favName: 'All', count: total || 0, index: 'all' })
  return res
}

module.exports = { parseFavoritesSettingInfo }
