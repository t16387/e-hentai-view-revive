// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
vi.mock('next/router', () => ({ default: { replace: vi.fn() } }))
import { canLoadDirect, isLocalReaderImageUrl, preloadImage } from '@/hooks/useReaderImages'

describe('direct image loading allowlist (browser side)', () => {
  it.each([
    ['https://abcd.efgh.hath.network:52018/h/x/keystamp=1/1.webp', true],
    ['https://zoyc.hath.network/om/1/x/1280/abc/3.webp', true],
    ['https://ehgt.org/w/01/000/x.webp', true],
    ['https://exhentai.org/fullimg/1/1/x/1.jpg', false], // needs cookies: proxy
    ['https://s.exhentai.org/t/aa/bb/x.webp', false],
    ['http://abcd.hath.network/h/x.webp', false],
    ['https://evilhath.network/x.webp', false],
    ['https://hath.network.evil.test/x.webp', false],
    ['https://user:pw@abcd.hath.network/x.webp', false],
    ['not a url', false],
  ])('%s -> %s', (url, ok) => {
    expect(canLoadDirect(url)).toBe(ok)
  })
})


describe('local / Downloads reader image URLs', () => {
  it('treats same-origin download paths as direct', () => {
    expect(isLocalReaderImageUrl('/api/downloads/abc/images/0')).toBe(true)
    expect(canLoadDirect('/api/downloads/abc/images/0')).toBe(true)
    expect(isLocalReaderImageUrl('https://ehgt.org/x.webp')).toBe(false)
  })
})

describe('preloadImage', () => {
  it('aborting clears the src (cancels the download) and rejects', async () => {
    const created: HTMLImageElement[] = []
    const Orig = window.Image
    ;(window as any).Image = class extends Orig {
      constructor() { super(); created.push(this) }
    }
    try {
      const ctrl = new AbortController()
      const p = preloadImage('https://a.hath.network/h/1.webp', { signal: ctrl.signal, priority: 'high' })
      expect(created[0].referrerPolicy).toBe('no-referrer')
      expect(created[0].decoding).toBe('async')
      ctrl.abort()
      await expect(p).rejects.toThrow('aborted')
      expect(created[0].getAttribute('src')).toBe('')
    } finally {
      ;(window as any).Image = Orig
    }
  })
})
