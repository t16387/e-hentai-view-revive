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

/** Join selected gallery tags into one f_search string (quoted ns:"tag$"). */
export function composeSelectedTags(
  tags: { namespace: string; name: string }[]
) {
  return tags.map((x) => tagTerm(x.namespace, x.name)).join(' ')
}

/** uploader search term, quoted only when needed */
export function uploaderTerm(name: string) {
  const n = name.trim()
  return /\s/.test(n) ? `uploader:${quote(n, false)}` : `uploader:${n}`
}

/** Category hide-bits used by f_cats (site JS toggle_category). ALL = 1023. */
export const CAT = {
  Misc: 1,
  Doujinshi: 2,
  Manga: 4,
  Artist_CG: 8,
  Game_CG: 16,
  Image_Set: 32,
  Cosplay: 64,
  Asian_Porn: 128,
  'Non-H': 256,
  Western: 512,
} as const

export type CatKey = keyof typeof CAT
export const CAT_KEYS = Object.keys(CAT) as CatKey[]
export const CAT_ALL = 1023

/** Display labels matching the live site (spaces, not underscores). */
export const CAT_LABEL: Record<CatKey, string> = {
  Misc: 'Misc',
  Doujinshi: 'Doujinshi',
  Manga: 'Manga',
  Artist_CG: 'Artist CG',
  Game_CG: 'Game CG',
  Image_Set: 'Image Set',
  Cosplay: 'Cosplay',
  Asian_Porn: 'Asian Porn',
  'Non-H': 'Non-H',
  Western: 'Western',
}

/** include-mask (bits set = shown) → f_cats hide-mask */
export function catsToHideMask(included: number) {
  return (CAT_ALL ^ (included & CAT_ALL)) & CAT_ALL
}

/** f_cats hide-mask → include-mask */
export function hideMaskToIncluded(f_cats: number) {
  return (CAT_ALL ^ (f_cats & CAT_ALL)) & CAT_ALL
}

export function isCatIncluded(included: number, key: CatKey) {
  return (included & CAT[key]) !== 0
}

export function toggleCatIncluded(included: number, key: CatKey) {
  return included ^ CAT[key]
}

/** Common language filter values (injected into f_search like JHenTai). */
export const SEARCH_LANGUAGES = [
  '',
  'english',
  'japanese',
  'chinese',
  'korean',
  'spanish',
  'french',
  'russian',
  'german',
  'portuguese',
  'italian',
  'thai',
  'vietnamese',
  'polish',
  'hungarian',
  'dutch',
  'n/a',
] as const

/**
 * Live site tag (e-hentai/exhentai, 2026-10): namespace `other`, name
 * `ai generated`. Exact term `other:"ai generated$"`. No dedicated front-page
 * control — peers inject the same tag / `-tag` into f_search.
 */
export const AI_GENERATED_NS = 'other'
export const AI_GENERATED_NAME = 'ai generated'
/** Include-only exact tag term */
export const AI_ONLY_TERM = 'other:"ai generated$"'
/** Exclude exact tag term (site shows "Excluded N galleries…") */
export const AI_EXCLUDE_TERM = '-other:"ai generated$"'

/** any = no AI clause; only = require tag; exclude = negate tag */
export type AiFilterMode = 'any' | 'only' | 'exclude'

export interface SearchFilters {
  f_search?: string
  /** hide-mask; 0 / omit = all categories shown */
  f_cats?: number
  f_sh?: boolean
  f_sto?: boolean
  /** 2–5; omit / 0 = any */
  f_srdd?: number
  f_spf?: number
  f_spt?: number
  f_sfl?: boolean
  f_sfu?: boolean
  f_sft?: boolean
  /** appended as language:"name$" when set */
  language?: string
  /**
   * AI-generated tag filter. Injected into f_search (not a separate GET flag).
   * Omit / 'any' = no clause.
   */
  ai?: AiFilterMode
  favcat?: string
}

const LANG_RE = /\blanguage:"([^"]+)"\$?/i
/** Match exact include or exclude of other:"ai generated$" (optional $). */
const AI_RE = /(^|\s)-?other:"ai generated\$?"(?=\s|$)/gi

/** Strip a language:"…" term so the text field stays editable. */
export function stripLanguageTerm(q: string) {
  return q.replace(LANG_RE, ' ').replace(/\s+/g, ' ').trim()
}

export function extractLanguageTerm(q: string): string | undefined {
  const m = q.match(LANG_RE)
  return m ? m[1].replace(/\$$/, '') : undefined
}

/** Remove AI include/exclude clauses from free-text query. */
export function stripAiTerm(q: string) {
  return q.replace(AI_RE, ' ').replace(/\s+/g, ' ').trim()
}

/** Detect AI filter mode encoded in a query string. */
export function extractAiFilter(q: string): AiFilterMode | undefined {
  const m = q.match(/(^|\s)(-)?other:"ai generated\$?"(?=\s|$)/i)
  if (!m) return undefined
  return m[2] === '-' ? 'exclude' : 'only'
}

export function aiTermForMode(mode: AiFilterMode | undefined) {
  if (mode === 'only') return AI_ONLY_TERM
  if (mode === 'exclude') return AI_EXCLUDE_TERM
  return ''
}

/**
 * Final f_search sent upstream: optional language + AI clauses + user text.
 * Language / AI already present in the text are left alone.
 */
export function composeSearchQuery(filters: SearchFilters) {
  let q = (filters.f_search || '').trim()
  const lang = (filters.language || '').trim()
  if (lang && !LANG_RE.test(q)) {
    q = `language:"${lang.replace(/"/g, '')}$"${q ? ' ' + q : ''}`
  }
  const ai = filters.ai && filters.ai !== 'any' ? filters.ai : undefined
  if (ai && !extractAiFilter(q)) {
    const term = aiTermForMode(ai)
    q = term + (q ? ' ' + q : '')
  }
  return q.trim()
}

function hasAdvanced(filters: SearchFilters) {
  return !!(
    filters.f_sh ||
    filters.f_sto ||
    (filters.f_srdd && filters.f_srdd >= 2) ||
    (filters.f_spf != null && filters.f_spf > 0) ||
    (filters.f_spt != null && filters.f_spt > 0) ||
    filters.f_sfl ||
    filters.f_sfu ||
    filters.f_sft
  )
}

/**
 * Build upstream/list query params. Empty / zero fields are omitted
 * (matches site search_presubmit). Values are plain strings (not encoded).
 */
export function buildSearchParams(
  filters: SearchFilters
): Record<string, string> {
  const out: Record<string, string> = {}
  const q = composeSearchQuery(filters)
  if (q) out.f_search = q

  const cats = filters.f_cats ?? 0
  if (cats > 0 && cats <= CAT_ALL) out.f_cats = String(cats)

  if (hasAdvanced(filters)) {
    out.advsearch = '1'
    if (filters.f_sh) out.f_sh = 'on'
    if (filters.f_sto) out.f_sto = 'on'
    if (filters.f_srdd && filters.f_srdd >= 2 && filters.f_srdd <= 5) {
      out.f_srdd = String(filters.f_srdd)
    }
    if (filters.f_spf != null && filters.f_spf > 0) {
      out.f_spf = String(filters.f_spf)
    }
    if (filters.f_spt != null && filters.f_spt > 0) {
      out.f_spt = String(filters.f_spt)
    }
    if (filters.f_sfl) out.f_sfl = 'on'
    if (filters.f_sfu) out.f_sfu = 'on'
    if (filters.f_sft) out.f_sft = 'on'
  }
  return out
}

/** encode params with encodeURIComponent (spaces as %20, not +) */
export function encodeSearchQuery(params: Record<string, string>) {
  return Object.keys(params)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join('&')
}

/** link to a search: query params URL-encoded exactly once */
export function searchHref(filters: SearchFilters | string, path = '/result') {
  const f: SearchFilters =
    typeof filters === 'string' ? { f_search: filters } : filters
  const qs = encodeSearchQuery(buildSearchParams(f))
  return qs ? `${path}?${qs}` : path
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

function readInt(
  value: string | string[] | undefined,
  min: number,
  max: number
) {
  const s = readQueryString(value)
  if (!s) return undefined
  const n = Number(s)
  if (!Number.isInteger(n) || n < min || n > max) return undefined
  return n
}

function readOn(value: string | string[] | undefined) {
  return readQueryString(value) === 'on'
}

/** Parse list/search filters from Next router.query (already decoded). */
export function readSearchFilters(
  query: Record<string, string | string[] | undefined>
): SearchFilters {
  const raw = readQueryString(query.f_search)
  const langFromQuery = readQueryString(query.language)
  const langInText = extractLanguageTerm(raw)
  const language = langFromQuery || langInText
  const aiFromQuery = readQueryString(query.ai) as AiFilterMode | ''
  const aiInText = extractAiFilter(raw)
  const ai: AiFilterMode | undefined =
    aiFromQuery === 'only' || aiFromQuery === 'exclude' || aiFromQuery === 'any'
      ? aiFromQuery === 'any'
        ? undefined
        : aiFromQuery
      : aiInText

  let f_search = raw
  if (language && langInText) f_search = stripLanguageTerm(f_search)
  if (ai && aiInText) f_search = stripAiTerm(f_search)

  const filters: SearchFilters = {}
  if (f_search) filters.f_search = f_search
  const cats = readInt(query.f_cats, 0, CAT_ALL)
  if (cats) filters.f_cats = cats
  if (readOn(query.f_sh)) filters.f_sh = true
  if (readOn(query.f_sto)) filters.f_sto = true
  const srdd = readInt(query.f_srdd, 2, 5)
  if (srdd) filters.f_srdd = srdd
  const spf = readInt(query.f_spf, 1, 9999)
  if (spf) filters.f_spf = spf
  const spt = readInt(query.f_spt, 1, 9999)
  if (spt) filters.f_spt = spt
  if (readOn(query.f_sfl)) filters.f_sfl = true
  if (readOn(query.f_sfu)) filters.f_sfu = true
  if (readOn(query.f_sft)) filters.f_sft = true
  if (language) filters.language = language
  if (ai) filters.ai = ai
  const favcat = readQueryString(query.favcat)
  if (favcat) filters.favcat = favcat
  return filters
}

/** Stable string for React keys / SWR identity when filters change. */
export function filtersKey(filters: SearchFilters) {
  return encodeSearchQuery(buildSearchParams(filters))
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

/** @deprecated use SearchFilters; kept as alias for call sites */
export type GalleryListFilters = SearchFilters

/**
 * Estimate how many list pages the site would return for a result set.
 * Uses the first page's item count as pageSize (typically 25). Returns
 * null when total or pageSize is unknown / zero. The site has no true
 * page=N; this is only for UI labels and jump bounds.
 */
export function estimateListPageCount(total: number, pageSize: number) {
  if (!Number.isFinite(total) || total <= 0) return null
  if (!Number.isFinite(pageSize) || pageSize <= 0) return null
  return Math.max(1, Math.ceil(total / pageSize))
}

/** Max forward cursor walks when jumping to a far page (product limit). */
export const LIST_JUMP_MAX_WALK = 50

/**
 * SWR-infinite key for cursor pagination. The site ignores `page=N`; each
 * page links to the next one with `next=<gid>` (favorites `<gid>-<ts>`).
 * Returns null when there is no further page.
 */
export function galleryListKey(
  mode: GalleryListMode,
  filters: SearchFilters,
  pageIndex: number,
  previous: ListCursorPage | null
): string | null {
  if (mode === 'popular') return pageIndex === 0 ? '/api/popular' : null
  if (pageIndex > 0 && !previous?.next) return null

  const params: Record<string, string> = {}
  if (mode === 'index' || mode === 'watched') {
    Object.assign(params, buildSearchParams(filters))
  }
  if (mode === 'favorites') params.favcat = filters.favcat || 'all'
  if (pageIndex > 0 && previous?.next) params.next = previous.next

  const endpoint =
    mode === 'index'
      ? '/api/gallery'
      : mode === 'favorites'
      ? '/api/favorites'
      : '/api/watched'
  const query = encodeSearchQuery(params)
  return query ? `${endpoint}?${query}` : endpoint
}
