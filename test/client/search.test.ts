import { describe, expect, it } from 'vitest'
import {
  galleryListKey,
  parseGalleryUrl,
  readQueryString,
  searchHref,
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
  it('uploader terms', () => {
    expect(uploaderTerm('someone')).toBe('uploader:someone')
    expect(uploaderTerm('some one')).toBe('uploader:"some one"')
  })
})

describe('URL encoding', () => {
  it('encodes the query exactly once', () => {
    const q = 'other:"a b$" 100% & more #1 +x'
    const href = searchHref(q)
    expect(href).toBe('/result?f_search=' + encodeURIComponent(q))
    // what Next's router hands back after decoding the URL once
    const decoded = new URLSearchParams(href.split('?')[1]).get('f_search')
    expect(readQueryString(decoded ?? undefined)).toBe(q)
  })
  it('readQueryString does not double-decode and handles missing values', () => {
    expect(readQueryString('100%')).toBe('100%') // decodeURIComponent would throw
    expect(readQueryString(undefined)).toBe('')
    expect(readQueryString(['a', 'b'])).toBe('a')
  })
  it('detects pasted gallery links on both domains', () => {
    expect(parseGalleryUrl('https://e-hentai.org/g/1000001/aaaaaaaaaa/')).toEqual({ gid: '1000001', token: 'aaaaaaaaaa' })
    expect(parseGalleryUrl('https://exhentai.org/g/1000001/aaaaaaaaaa/')).toEqual({ gid: '1000001', token: 'aaaaaaaaaa' })
    expect(parseGalleryUrl('just words')).toBeNull()
  })
})

describe('galleryListKey (cursor pagination)', () => {
  it('first page has no cursor', () => {
    expect(galleryListKey('index', {}, 0, null)).toBe('/api/gallery')
    expect(galleryListKey('index', { f_search: 'a&b' }, 0, null)).toBe('/api/gallery?f_search=a%26b')
  })
  it('next pages carry the previous page next cursor', () => {
    expect(galleryListKey('index', { f_search: 'x y' }, 1, { next: '1000001' })).toBe('/api/gallery?f_search=x+y&next=1000001')
    expect(galleryListKey('watched', {}, 3, { next: '42' })).toBe('/api/watched?next=42')
  })
  it('stops when the previous page has no next cursor', () => {
    expect(galleryListKey('index', {}, 1, { next: null })).toBeNull()
    expect(galleryListKey('index', {}, 1, {})).toBeNull()
  })
  it('favorites keep favcat and use gid-favtime cursors', () => {
    expect(galleryListKey('favorites', {}, 0, null)).toBe('/api/favorites?favcat=all')
    expect(galleryListKey('favorites', { favcat: '2' }, 1, { next: '1000001-1700000000' })).toBe('/api/favorites?favcat=2&next=1000001-1700000000')
  })
  it('popular has a single page', () => {
    expect(galleryListKey('popular', {}, 0, null)).toBe('/api/popular')
    expect(galleryListKey('popular', {}, 1, { next: '1' })).toBeNull()
  })
  it('never sends page=', () => {
    for (let i = 0; i < 3; i++) expect(galleryListKey('index', { f_search: 'q' }, i, { next: '9' })).not.toMatch(/page=/)
  })
})
