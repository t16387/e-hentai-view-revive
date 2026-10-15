import { describe, expect, it } from 'vitest'
import {
  AI_EXCLUDE_TERM,
  AI_ONLY_TERM,
  CAT,
  CAT_ALL,
  LIST_JUMP_MAX_WALK,
  resolveListEstimatedPages,
  buildSearchParams,
  catsToHideMask,
  clearJumpingOnCancel,
  clampListJumpTarget,
  composeSearchQuery,
  estimateListPageCount,
  extractAiFilter,
  extractLanguageTerm,
  filtersKey,
  galleryListKey,
  hideMaskToIncluded,
  mergeListPagerQuery,
  parseGalleryUrl,
  readListPagerQuery,
  readQueryString,
  readSearchFilters,
  searchHref,
  stripAiTerm,
  stripLanguageTerm,
  composeSelectedTags,
  tagTerm,
  tagTermFromKeyword,
  uploaderTerm,
} from '@/utils/search'

describe('search terms', () => {
  it('quotes tags as ns:"tag$"', () => {
    expect(tagTerm('other', 'placeholder')).toBe('other:"placeholder$"')
    expect(tagTerm('other', 'multi word tag')).toBe('other:"multi word tag$"')
    expect(tagTermFromKeyword('misc:two words')).toBe('misc:"two words$"')
  })
  it('composes multi-tag f_search', () => {
    expect(
      composeSelectedTags([
        { namespace: 'artist', name: 'someone' },
        { namespace: 'female', name: 'long hair' },
      ])
    ).toBe('artist:"someone$" female:"long hair$"')
    expect(composeSelectedTags([])).toBe('')
  })
  it('uploader terms', () => {
    expect(uploaderTerm('someone')).toBe('uploader:someone')
    expect(uploaderTerm('some one')).toBe('uploader:"some one"')
  })
})

describe('category bitmask', () => {
  it('maps include ↔ hide like site toggle_category / JHenTai', () => {
    expect(catsToHideMask(CAT_ALL)).toBe(0)
    expect(hideMaskToIncluded(0)).toBe(CAT_ALL)
    // hide Doujinshi only
    expect(catsToHideMask(CAT_ALL ^ CAT.Doujinshi)).toBe(CAT.Doujinshi)
    expect(hideMaskToIncluded(CAT.Doujinshi)).toBe(CAT_ALL ^ CAT.Doujinshi)
    // Non-H only
    expect(catsToHideMask(CAT['Non-H'])).toBe(CAT_ALL ^ CAT['Non-H'])
    expect(catsToHideMask(CAT['Non-H'])).toBe(767) // 1023-256
  })
  it('individual hide bits match EHWiki / live cat_* ids', () => {
    expect(CAT.Misc).toBe(1)
    expect(CAT.Doujinshi).toBe(2)
    expect(CAT.Manga).toBe(4)
    expect(CAT.Artist_CG).toBe(8)
    expect(CAT.Game_CG).toBe(16)
    expect(CAT.Image_Set).toBe(32)
    expect(CAT.Cosplay).toBe(64)
    expect(CAT.Asian_Porn).toBe(128)
    expect(CAT['Non-H']).toBe(256)
    expect(CAT.Western).toBe(512)
    expect(CAT_ALL).toBe(1023)
  })
})

describe('buildSearchParams', () => {
  it('omits empty / all-categories / any-rating', () => {
    expect(buildSearchParams({})).toEqual({})
    expect(buildSearchParams({ f_cats: 0, f_srdd: 0 })).toEqual({})
    expect(buildSearchParams({ f_search: '  hello  ' })).toEqual({
      f_search: 'hello',
    })
  })
  it('sets advsearch when any advanced flag is on', () => {
    expect(buildSearchParams({ f_sto: true, f_srdd: 4 })).toEqual({
      advsearch: '1',
      f_sto: 'on',
      f_srdd: '4',
    })
    expect(
      buildSearchParams({ f_sh: true, f_spf: 10, f_spt: 200, f_sfl: true })
    ).toEqual({
      advsearch: '1',
      f_sh: 'on',
      f_spf: '10',
      f_spt: '200',
      f_sfl: 'on',
    })
  })
  it('injects language into f_search', () => {
    expect(buildSearchParams({ language: 'english', f_search: 'foo' })).toEqual(
      {
        f_search: 'language:"english$" foo',
      }
    )
    expect(
      composeSearchQuery({
        f_search: 'language:"japanese$" bar',
        language: 'english',
      })
    ).toBe('language:"japanese$" bar')
  })
  it('injects AI only / exclude into f_search', () => {
    expect(buildSearchParams({ ai: 'only' })).toEqual({
      f_search: AI_ONLY_TERM,
    })
    expect(buildSearchParams({ ai: 'exclude', f_search: 'foo' })).toEqual({
      f_search: AI_EXCLUDE_TERM + ' foo',
    })
    expect(buildSearchParams({ ai: 'any' })).toEqual({})
    expect(
      composeSearchQuery({
        f_search: AI_ONLY_TERM + ' bar',
        ai: 'exclude',
      })
    ).toBe(AI_ONLY_TERM + ' bar')
  })
  it('searchHref encodes once and carries cats', () => {
    const href = searchHref({
      f_search: 'a&b',
      f_cats: CAT.Misc | CAT.Doujinshi,
      f_sto: true,
    })
    expect(href).toContain('/result?')
    const qs = new URLSearchParams(href.split('?')[1])
    expect(qs.get('f_search')).toBe('a&b')
    expect(qs.get('f_cats')).toBe(String(CAT.Misc | CAT.Doujinshi))
    expect(qs.get('advsearch')).toBe('1')
    expect(qs.get('f_sto')).toBe('on')
  })
})

describe('readSearchFilters', () => {
  it('parses router.query values', () => {
    const f = readSearchFilters({
      f_search: 'language:"english$" test',
      f_cats: '3',
      f_sh: 'on',
      f_srdd: '5',
      f_spf: '20',
      evil: '1',
    })
    expect(f.f_search).toBe('test')
    expect(f.language).toBe('english')
    expect(f.f_cats).toBe(3)
    expect(f.f_sh).toBe(true)
    expect(f.f_srdd).toBe(5)
    expect(f.f_spf).toBe(20)
    expect(stripLanguageTerm('language:"chinese$" x')).toBe('x')
    expect(extractLanguageTerm('language:"korean$"')).toBe('korean')
  })
  it('parses and strips AI filter terms', () => {
    const only = readSearchFilters({
      f_search: AI_ONLY_TERM + ' cats',
    })
    expect(only.ai).toBe('only')
    expect(only.f_search).toBe('cats')
    const excl = readSearchFilters({
      f_search: AI_EXCLUDE_TERM + ' dogs',
    })
    expect(excl.ai).toBe('exclude')
    expect(excl.f_search).toBe('dogs')
    expect(readSearchFilters({ ai: 'only' }).ai).toBe('only')
    expect(extractAiFilter(AI_EXCLUDE_TERM)).toBe('exclude')
    expect(stripAiTerm(AI_ONLY_TERM + ' x')).toBe('x')
  })
  it('rejects out-of-range numbers', () => {
    expect(readSearchFilters({ f_cats: '5000', f_srdd: '9' })).toEqual({})
  })
})

describe('URL encoding', () => {
  it('encodes the query exactly once', () => {
    const q = 'other:"a b$" 100% & more #1 +x'
    const href = searchHref(q)
    expect(href).toBe('/result?f_search=' + encodeURIComponent(q))
    const decoded = new URLSearchParams(href.split('?')[1]).get('f_search')
    expect(readQueryString(decoded ?? undefined)).toBe(q)
  })
  it('readQueryString does not double-decode and handles missing values', () => {
    expect(readQueryString('100%')).toBe('100%')
    expect(readQueryString(undefined)).toBe('')
    expect(readQueryString(['a', 'b'])).toBe('a')
  })
  it('detects pasted gallery links on both domains', () => {
    expect(
      parseGalleryUrl('https://e-hentai.org/g/1000001/aaaaaaaaaa/')
    ).toEqual({ gid: '1000001', token: 'aaaaaaaaaa' })
    expect(
      parseGalleryUrl('https://exhentai.org/g/1000001/aaaaaaaaaa/')
    ).toEqual({ gid: '1000001', token: 'aaaaaaaaaa' })
    expect(parseGalleryUrl('just words')).toBeNull()
  })
})

describe('galleryListKey (cursor pagination)', () => {
  it('first page has no cursor', () => {
    expect(galleryListKey('index', {}, 0, null)).toBe('/api/gallery')
    expect(galleryListKey('index', { f_search: 'a&b' }, 0, null)).toBe(
      '/api/gallery?f_search=a%26b'
    )
  })
  it('forwards advanced filters on index and watched', () => {
    const key = galleryListKey(
      'index',
      { f_search: 'x', f_cats: 1, f_sto: true, f_srdd: 3 },
      0,
      null
    )!
    const qs = new URLSearchParams(key.split('?')[1])
    expect(qs.get('f_cats')).toBe('1')
    expect(qs.get('advsearch')).toBe('1')
    expect(qs.get('f_sto')).toBe('on')
    expect(qs.get('f_srdd')).toBe('3')
    const w = galleryListKey('watched', { f_cats: 2 }, 0, null)!
    expect(w).toContain('f_cats=2')
  })
  it('next pages carry the previous page next cursor', () => {
    expect(
      galleryListKey('index', { f_search: 'x y' }, 1, { next: '1000001' })
    ).toBe('/api/gallery?f_search=x%20y&next=1000001')
    expect(galleryListKey('watched', {}, 3, { next: '42' })).toBe(
      '/api/watched?next=42'
    )
  })
  it('stops when the previous page has no next cursor', () => {
    expect(galleryListKey('index', {}, 1, { next: null })).toBeNull()
    expect(galleryListKey('index', {}, 1, {})).toBeNull()
  })
  it('favorites keep favcat and use gid-favtime cursors', () => {
    expect(galleryListKey('favorites', {}, 0, null)).toBe(
      '/api/favorites?favcat=all'
    )
    expect(
      galleryListKey('favorites', { favcat: '2' }, 1, {
        next: '1000001-1700000000',
      })
    ).toBe('/api/favorites?favcat=2&next=1000001-1700000000')
  })
  it('popular has a single page', () => {
    expect(galleryListKey('popular', {}, 0, null)).toBe('/api/popular')
    expect(galleryListKey('popular', {}, 1, { next: '1' })).toBeNull()
  })
  it('never sends page=', () => {
    for (let i = 0; i < 3; i++)
      expect(
        galleryListKey('index', { f_search: 'q' }, i, { next: '9' })
      ).not.toMatch(/page=/)
  })
  it('filtersKey is stable', () => {
    expect(filtersKey({ f_search: 'a', f_cats: 1 })).toBe(
      filtersKey({ f_cats: 1, f_search: 'a' })
    )
  })
})

describe('list page estimates (cursor UX)', () => {
  it('estimates page count from total and page size', () => {
    expect(estimateListPageCount(100, 25)).toBe(4)
    expect(estimateListPageCount(101, 25)).toBe(5)
    expect(estimateListPageCount(0, 25)).toBeNull()
    expect(estimateListPageCount(50, 0)).toBeNull()
  })
  it('caps forward jump walks', () => {
    expect(LIST_JUMP_MAX_WALK).toBe(50)
  })

  it('clamps Y when cursor chain ends before EH approximate total', () => {
    // 900/25 ≈ 36, but chain ended after 13 pages
    expect(
      resolveListEstimatedPages({
        mode: 'index',
        total: 900,
        rawPageSize: 25,
        pageCountLoaded: 13,
        lastHasNext: false,
        knownLastIndex: null,
      })
    ).toBe(13)
    expect(
      resolveListEstimatedPages({
        mode: 'index',
        total: 900,
        rawPageSize: 25,
        pageCountLoaded: 13,
        lastHasNext: true,
        knownLastIndex: null,
      })
    ).toBe(36)
  })
  it('does not inflate Y when first page is partial from exclusions', () => {
    expect(
      resolveListEstimatedPages({
        mode: 'index',
        total: 900,
        rawPageSize: 21, // 4 excluded on page 1
        pageCountLoaded: 1,
        lastHasNext: true,
        knownLastIndex: null,
      })
    ).toBe(36)
  })
  it('knownLastIndex wins over approximate total', () => {
    expect(
      resolveListEstimatedPages({
        mode: 'index',
        total: 900,
        rawPageSize: 25,
        pageCountLoaded: 20,
        lastHasNext: true,
        knownLastIndex: 12,
      })
    ).toBe(13)
  })
})

describe('list pager URL restore', () => {
  it('reads page/last as 0-based state and clamps page to last', () => {
    expect(readListPagerQuery({})).toEqual({
      viewPage: 0,
      knownLastIndex: null,
    })
    expect(
      readListPagerQuery({ page: '13', last: '13', f_search: 'q' })
    ).toEqual({ viewPage: 12, knownLastIndex: 12 })
    expect(readListPagerQuery({ page: '25', last: '13' })).toEqual({
      viewPage: 12,
      knownLastIndex: 12,
    })
    expect(readListPagerQuery({ page: '0' })).toEqual({
      viewPage: 0,
      knownLastIndex: null,
    })
    expect(readListPagerQuery({ page: 'abc', last: '-1' })).toEqual({
      viewPage: 0,
      knownLastIndex: null,
    })
  })

  it('merges pager into query without wiping filters', () => {
    const base = { f_search: 'female:"drugs$"', ai: 'exclude', language: 'chinese' }
    expect(mergeListPagerQuery(base, 0, null)).toEqual(base)
    expect(mergeListPagerQuery(base, 12, 12)).toEqual({
      ...base,
      page: '13',
      last: '13',
    })
    expect(
      mergeListPagerQuery({ ...base, page: '5', last: '9' }, 0, null)
    ).toEqual(base)
  })

  it('readSearchFilters ignores page/last so filters survive restore', () => {
    const f = readSearchFilters({
      f_search: 'female:"drugs$"',
      language: 'chinese',
      ai: 'exclude',
      page: '13',
      last: '13',
    })
    expect(f.f_search).toBe('female:"drugs$"')
    expect(f.language).toBe('chinese')
    expect(f.ai).toBe('exclude')
    expect((f as any).page).toBeUndefined()
  })

  it('clampListJumpTarget clamps beyond known last without a long walk', () => {
    expect(clampListJumpTarget(24, 12)).toEqual({ target: 12, clamped: true })
    expect(clampListJumpTarget(5, 12)).toEqual({ target: 5, clamped: false })
    expect(clampListJumpTarget(24, null)).toEqual({ target: 24, clamped: false })
    expect(clampListJumpTarget(-3, 12)).toEqual({ target: 0, clamped: true })
  })

  it('clearJumpingOnCancel bumps gen and always clears jumping', () => {
    const jumpGen = { current: 3 }
    let jumping = true
    clearJumpingOnCancel(jumpGen, (v) => {
      jumping = v
    })
    expect(jumpGen.current).toBe(4)
    expect(jumping).toBe(false)
    // Simulate finally: stale gen must not leave jumping stuck after cancel
    const staleGen = 3
    if (jumpGen.current === staleGen) jumping = false
    else {
      // cancel already cleared; a new jump would set true again
      expect(jumping).toBe(false)
    }
  })

  it('after restore, knownLastIndex keeps Y clamped (13 not 36)', () => {
    expect(
      resolveListEstimatedPages({
        mode: 'index',
        total: 900,
        rawPageSize: 25,
        pageCountLoaded: 1,
        lastHasNext: true,
        knownLastIndex: 12,
      })
    ).toBe(13)
  })
})
