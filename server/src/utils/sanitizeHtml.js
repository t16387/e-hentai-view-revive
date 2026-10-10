const { JSDOM } = require('jsdom')

const ALLOWED_TAGS = new Set([
  'A',
  'B',
  'BR',
  'DIV',
  'EM',
  'I',
  'P',
  'SPAN',
  'STRONG',
  'U',
])
const ALLOWED_ATTRS = {
  A: new Set(['href', 'title']),
  SPAN: new Set(['class', 'id']),
  DIV: new Set(['class']),
}

function isSafeHref(href) {
  const v = String(href || '').trim()
  if (!v) return false
  if (/^(javascript|data|vbscript):/i.test(v)) return false
  if (/^https?:\/\//i.test(v)) return true
  if (v.startsWith('/') || v.startsWith('#') || v.startsWith('?')) return true
  return false
}

/** strip scripts/events from comment HTML; keep anchors for in-app rewrite */
function sanitizeCommentHtml(html) {
  if (!html || typeof html !== 'string') return ''
  const dom = new JSDOM(`<div id="ehv-sanitize-root">${html}</div>`)
  const root = dom.window.document.getElementById('ehv-sanitize-root')
  const walk = (node) => {
    const children = Array.from(node.childNodes)
    for (const child of children) {
      if (child.nodeType === dom.window.Node.ELEMENT_NODE) {
        const tag = child.tagName
        if (!ALLOWED_TAGS.has(tag)) {
          while (child.firstChild) node.insertBefore(child.firstChild, child)
          node.removeChild(child)
          continue
        }
        for (const attr of Array.from(child.attributes)) {
          const allow = ALLOWED_ATTRS[tag]
          const name = attr.name.toLowerCase()
          if (!allow || !allow.has(name)) {
            child.removeAttribute(attr.name)
            continue
          }
          if (name === 'href' && !isSafeHref(attr.value)) {
            child.removeAttribute(attr.name)
          }
        }
        walk(child)
      } else if (child.nodeType === dom.window.Node.COMMENT_NODE) {
        node.removeChild(child)
      }
    }
  }
  walk(root)
  return root.innerHTML
}

module.exports = { sanitizeCommentHtml }
