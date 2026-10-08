import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
const require = createRequire(import.meta.url)
const {
  isAllowedImageUrl,
  isSiteUrl,
  isImagePageUrl,
} = require('../../server/src/utils/upstreamUrl')
const { upstreamCookieString } = require('../../server/src/utils/cookies')

describe('image proxy allowlist', () => {
  it.each([
    'https://ehgt.org/w/00/000/00000-aaaa.webp',
    'https://s.exhentai.org/t/aa/bb/x.jpg',
    'https://e-hentai.org/img/509.gif',
    'https://abcd.efgh.hath.network:4433/h/key/keystamp/0-0.webp',
  ])('allows %s', (url) => expect(isAllowedImageUrl(url)).toBe(true))

  it.each([
    'http://127.0.0.1:8080/api',
    'http://169.254.169.254/latest/meta-data',
    'https://evil.example/?u=ehgt.org',
    'https://ehgt.org.evil.example/x.jpg',
    'file:///etc/passwd',
    'not a url',
    undefined,
  ])('rejects %s', (url) => expect(isAllowedImageUrl(url)).toBe(false))

  it('sends site cookies only to the site itself', () => {
    expect(isSiteUrl('https://exhentai.org/s/aa/1-1')).toBe(true)
    expect(isSiteUrl('https://ehgt.org/x.jpg')).toBe(false)
    expect(isSiteUrl('https://a.b.hath.network/h/x')).toBe(false)
  })
})

describe('loadImg url check', () => {
  it('accepts image pages', () => {
    expect(isImagePageUrl('https://e-hentai.org/s/0a1b2c3d4e/1000001-12')).toBe(true)
    expect(isImagePageUrl('https://exhentai.org/s/0a1b2c3d4e/1000001-1?nl=1-2')).toBe(true)
  })
  it('rejects anything else', () => {
    expect(isImagePageUrl('https://e-hentai.org/g/1000001/abcdef0123/')).toBe(false)
    expect(isImagePageUrl('http://e-hentai.org/s/0a1b/1-1')).toBe(false)
    expect(isImagePageUrl('https://example.com/s/0a1b/1-1')).toBe(false)
  })
})

describe('upstream cookies', () => {
  it('forwards only site cookies and always adds nw=1', () => {
    const s = upstreamCookieString({
      ipb_member_id: '1',
      ipb_pass_hash: 'h',
      igneous: 'i',
      sk: 'k',
      _ga: 'analytics',
      NEXT_LOCALE: 'en',
      test: 'true',
    })
    expect(s).toBe('ipb_member_id=1; ipb_pass_hash=h; igneous=i; sk=k; nw=1')
  })
  it('works for anonymous requests', () => {
    expect(upstreamCookieString({})).toBe('nw=1')
    expect(upstreamCookieString(undefined)).toBe('nw=1')
  })
})
