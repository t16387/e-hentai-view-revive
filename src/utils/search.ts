/**
 * Search helpers shared by the search box, tag chips, uploader links and
 * the infinite-scroll list hook.
 */

/** quote a search term when it contains whitespace or quotes */
function quote(value: string, exact: boolean) {
  const v = value.trim().replace(/"/g, '')
  return `"${v}${exact ? '$' : ''}"`
}

/**
 * Exact tag search term as the site expects it: `namespace:"tag$"`.
 * Unquoted multi-word tags were split into separate terms by the site.
 */
export function tagTerm(namespace: string, name: string) {
  return `${namespace.trim()}:${quote(name, true)}`
}

/** `"other:some tag"` (keyword as returned by the API) -> `other:"some tag$"` */
export function tagTermFromKeyword(keyword: string) {
  const i = keyword.indexOf(':')
  if (i === -1) return quote(keyword, true)
  return tagTerm(keyword.slice(0, i), keyword.slice(i + 1))
}

/** uploader search term, quoted only when needed */
export function uploaderTerm(name: string) {
  const n = name.trim()
  return /\s/.test(n) ? `uploader:${quote(n, false)}` : `uploader:${n}`
}

/** link to a search: the query is URL-encoded exactly once */
export function searchHref(f_search: string, path = '/result') {
  return `${path}?f_search=${encodeURIComponent(f_search)}`
}

/**
 * Read `f_search` from Next's router.query. Next already decodes query
 * values, so decoding again (the old code) threw on a literal `%` and
 * mangled `+`. Returns '' until the value exists.
 */
export function readQueryString(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] || ''
  return value || ''
}

/** gallery id + token from a pasted e-hentai / exhentai gallery URL */
export function parseGalleryUrl(text: string) {
  const m = text.match(/(?:e-|ex)hentai\.org\/g\/(\d+)\/([0-9a-f]+)/)
  return m ? { gid: m[1], token: m[2] } : null
}

export type GalleryListMode = 'index' | 'popular' | 'favorites' | 'watched'

export interface ListCursorPage {
  next?: string | null
  prev?: string | null
}

export interface GalleryListFilters {
  f_search?: string
  favcat?: string
}

/**
 * SWR-infinite key for cursor pagination. The site ignores `page=N`; each
 * page links to the next one with `next=<gid>` (favorites `<gid>-<ts>`).
 * Returns null when there is no further page.
 */
export function galleryListKey(
  mode: GalleryListMode,
  filters: GalleryListFilters,
  pageIndex: number,
  previous: ListCursorPage | null
): string | null {
  if (mode === 'popular') return pageIndex === 0 ? '/api/popular' : null
  if (pageIndex > 0 && !previous?.next) return null

  const qs = new URLSearchParams()
  if (mode === 'index' && filters.f_search) qs.set('f_search', filters.f_search)
  if (mode === 'favorites') qs.set('favcat', filters.favcat || 'all')
  if (pageIndex > 0 && previous?.next) qs.set('next', previous.next)

  const endpoint =
    mode === 'index'
      ? '/api/gallery'
      : mode === 'favorites'
      ? '/api/favorites'
      : '/api/watched'
  const query = qs.toString()
  return query ? `${endpoint}?${query}` : endpoint
}
