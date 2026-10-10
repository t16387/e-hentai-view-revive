/**
 * Allowlist sanitizer for gallery comment HTML.
 * Keeps in-app gallery-link rewriting working (anchors with href).
 */
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

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  A: new Set(['href', 'title']),
  SPAN: new Set(['class', 'id']),
  DIV: new Set(['class']),
}

function isSafeHref(href: string): boolean {
  const v = href.trim()
  if (!v) return false
  // gallery links, relative paths, http(s) only — no javascript:/data:
  if (/^(javascript|data|vbscript):/i.test(v)) return false
  if (/^https?:\/\//i.test(v)) return true
  if (v.startsWith('/') || v.startsWith('#') || v.startsWith('?')) return true
  return false
}

export function sanitizeCommentHtml(html: string): string {
  if (!html || typeof html !== 'string') return ''
  if (typeof document === 'undefined') {
    // SSR: strip tags as a safe fallback (comments render client-side)
    return html.replace(/<[^>]*>/g, '')
  }
  const template = document.createElement('template')
  template.innerHTML = html
  const walk = (node: Node) => {
    const children = Array.from(node.childNodes)
    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement
        const tag = el.tagName
        if (!ALLOWED_TAGS.has(tag)) {
          // unwrap text, drop the element
          while (el.firstChild) node.insertBefore(el.firstChild, el)
          node.removeChild(el)
          continue
        }
        // drop disallowed attributes
        for (const attr of Array.from(el.attributes)) {
          const allow = ALLOWED_ATTRS[tag]
          if (!allow || !allow.has(attr.name.toLowerCase())) {
            el.removeAttribute(attr.name)
            continue
          }
          if (attr.name.toLowerCase() === 'href' && !isSafeHref(attr.value)) {
            el.removeAttribute(attr.name)
          }
        }
        walk(el)
      } else if (child.nodeType === Node.COMMENT_NODE) {
        node.removeChild(child)
      }
    }
  }
  walk(template.content)
  return template.innerHTML
}
