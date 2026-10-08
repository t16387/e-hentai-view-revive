/**
 * End-to-end through the real express app (routers + error handler) over
 * HTTP on 127.0.0.1, with every upstream request mocked: no network.
 */
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import http from 'node:http'
import { format } from 'node:util'
import { require, fixture } from './helpers'

const express = require('express')
const axios = require('../../server/src/axios')

// fake but recognisable cookie values: they must never show up in logs or responses
const SECRET = 'ZZsecretpasshashZZ'
const COOKIE = `ipb_member_id=1; ipb_pass_hash=${SECRET}; igneous=ZZigneousZZ`

let server
let base
const logs = []
beforeAll(async () => {
  // app.js listens on require; keep it from binding PORT
  vi.spyOn(express.application, 'listen').mockImplementation(() => null)
  const app = require('../../server/src/app')
  server = http.createServer(app)
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  base = `http://127.0.0.1:${server.address().port}`
})
afterAll(() => new Promise((r) => server.close(r)))
afterEach(() => {
  vi.mocked(axios.get).mockRestore?.()
  logs.length = 0
})

function captureLogs() {
  for (const m of ['log', 'error', 'warn'])
    vi.spyOn(console, m).mockImplementation((...a) => logs.push(format(...a)))
}
async function get(path, { cookie = COOKIE } = {}) {
  captureLogs()
  const res = await fetch(base + path, { headers: cookie ? { cookie } : {} })
  const text = await res.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch (e) {}
  vi.mocked(console.log).mockRestore()
  vi.mocked(console.error).mockRestore()
  vi.mocked(console.warn).mockRestore()
  return { status: res.status, json, text, headers: res.headers }
}
const html = (data, extra = {}) => ({
  status: 200,
  headers: { 'content-type': 'text/html; charset=UTF-8', ...extra },
  data,
})
const mockUpstream = (impl) => vi.spyOn(axios, 'get').mockImplementation(impl)
const noSecrets = (r) => {
  expect(r.text).not.toContain(SECRET)
  expect(logs.join('\n')).not.toContain(SECRET)
  expect(logs.join('\n')).not.toContain('ZZigneousZZ')
}

describe('API error codes', () => {
  it('no login cookie on exhentai -> No login, no upstream request', async () => {
    const up = mockUpstream(async () => html(''))
    const r = await get('/api/gallery', { cookie: '' })
    expect(r.json).toMatchObject({ error: true, message: 'No login' })
    expect(up).not.toHaveBeenCalled()
  })

  it.each([
    ['blank page', () => html('')],
    [
      'image instead of a page',
      () => ({
        status: 200,
        headers: { 'content-type': 'image/gif' },
        data: 'GIF89a',
      }),
    ],
    [
      'igneous=mystery',
      () =>
        html('<html><body>x</body></html>', {
          'set-cookie': ['igneous=mystery; path=/'],
        }),
    ],
    [
      'redirect away',
      () => ({
        status: 302,
        headers: { location: 'https://e-hentai.org/' },
        data: '',
      }),
    ],
  ])('sad panda (%s) -> code "sad panda"', async (_n, reply) => {
    mockUpstream(async () => reply())
    const r = await get('/api/gallery?f_search=sp')
    expect(r.status).toBe(200)
    expect(r.json).toMatchObject({ error: true, code: 'sad panda' })
    noSecrets(r)
  })

  it.each([
    ['404', () => ({ status: 404, headers: {}, data: 'Not found' }), '404'],
    [
      'key missing',
      () => html('Key missing, or incorrect key provided.'),
      '404',
    ],
    [
      'cloudflare',
      () => ({
        status: 403,
        headers: { 'cf-mitigated': 'challenge' },
        data: 'Just a moment...',
      }),
      'cloudflare',
    ],
    [
      'ban',
      () =>
        html(
          'Your IP address has been temporarily banned for excessive pageloads'
        ),
      'banned',
    ],
    ['500', () => ({ status: 500, headers: {}, data: 'oops' }), 'http 500'],
  ])('detail %s -> error code', async (_n, reply, code) => {
    mockUpstream(async () => reply())
    const r = await get('/api/gallery/1000001/aaaaaaaaaa')
    expect(r.json).toMatchObject({ error: true, code })
    noSecrets(r)
  })

  it('upstream timeout: error answer, cookie from the axios config never logged or returned', async () => {
    mockUpstream(async (url, config) => {
      throw Object.assign(new Error('timeout of 20000ms exceeded'), {
        code: 'ECONNABORTED',
        config,
        request: {
          _header: `GET / HTTP/1.1\r\nCookie: ${config.headers.Cookie}`,
        },
      })
    })
    const r = await get('/api/watched')
    expect(r.json).toMatchObject({
      error: true,
      message: 'timeout of 20000ms exceeded',
    })
    expect(logs.some((l) => l.includes('[api] GET /api/watched'))).toBe(true)
    noSecrets(r)
  })

  it('list page without any gallery list -> code "parse", not an empty list', async () => {
    mockUpstream(async () =>
      html('<html><body><p>unexpected</p></body></html>')
    )
    const r = await get('/api/gallery?f_search=parse')
    expect(r.json).toMatchObject({ error: true, code: 'parse' })
  })

  it('real "no hits" -> empty list, not an error', async () => {
    mockUpstream(async () => html(fixture('list-nohits.html')))
    const r = await get('/api/gallery?f_search=nohits')
    expect(r.json).toMatchObject({ error: false, list: [], next: null })
  })

  it('content warning interstitial -> error', async () => {
    mockUpstream(async () => html(fixture('detail-content-warning.html')))
    const r = await get('/api/gallery/1000002/aaaaaaaaaa')
    expect(r.json.error).toBe(true)
  })

  it('bad params -> HTTP 400 without any upstream request', async () => {
    const up = mockUpstream(async () => html(''))
    for (const path of [
      '/api/gallery/1000001/aaaaaaaaaa/abc',
      '/api/gallery/..%2F..%2Fuconfig.php/x',
      '/api/gallery/1/..%2F..%2Fhome.php/torrent',
      '/api/gallery/loadImg?url=' +
        encodeURIComponent('https://example.com/s/aa/1-1'),
      '/api/gallery/proxy?url=' + encodeURIComponent('http://169.254.169.254/'),
      '/api/gallery/proxy?url=' +
        encodeURIComponent('https://evil.test;.exhentai.org/x.jpg'),
      '/api/gallery/proxy?url=a&url=b',
    ]) {
      const r = await get(path)
      expect(r.status, path).toBe(400)
    }
    expect(up).not.toHaveBeenCalled()
  })

  it('proxy: image host timeout -> 504', async () => {
    mockUpstream(async () => {
      throw Object.assign(new Error('timeout of 20000ms exceeded'), {
        code: 'ECONNABORTED',
      })
    })
    const r = await get(
      '/api/gallery/proxy?url=' +
        encodeURIComponent('https://a.b.hath.network:52018/h/x/1.jpg')
    )
    expect(r.status).toBe(504)
    noSecrets(r)
  })

  it('loadImg: 509 quota image -> error with the 509 message', async () => {
    mockUpstream(async () => html(fixture('image-page-509.html')))
    const r = await get(
      '/api/gallery/loadImg?url=' +
        encodeURIComponent('https://exhentai.org/s/0000000001/1000001-1')
    )
    expect(r.json).toMatchObject({ error: true })
    expect(r.json.message).toMatch(/509/)
  })
})

describe('favorites / watched pagination through the API', () => {
  it('favorites page 2: favcat + gid-favtime cursor upstream, cursors back', async () => {
    const up = mockUpstream(async () => html(fixture('favorites-p2.html')))
    const r = await get('/api/favorites?next=4000003-1700000300')
    expect(up.mock.calls[0][0]).toMatch(/\/favorites\.php$/)
    expect(up.mock.calls[0][1].params).toEqual({
      favcat: 'all',
      next: '4000003-1700000300',
    })
    expect(r.json).toMatchObject({
      error: false,
      next: '4000001-1700000100',
      prev: '4000002-1700000200',
      total: 15,
    })
    expect(r.json.list).toHaveLength(2)
  })

  it('favorites category + malformed cursor: category kept, cursor dropped', async () => {
    const up = mockUpstream(async () => html(fixture('favorites-p2.html')))
    await get('/api/favorites?favcat=1&next=1;drop')
    expect(up.mock.calls[0][1].params).toEqual({ favcat: '1' })
  })

  it('favorites info: categories with counts', async () => {
    mockUpstream(async () => html(fixture('favorites-p2.html')))
    const r = await get('/api/favorites/info')
    expect(r.json.error).toBe(false)
    expect(r.json.list).toHaveLength(4)
    expect(r.json.list.filter((c) => +c.count > 0)).toHaveLength(3)
  })

  it('watched page 2: next cursor upstream, no page=', async () => {
    const up = mockUpstream(async () => html(fixture('list-compact.html')))
    const r = await get('/api/watched?next=1000004&page=3')
    expect(up.mock.calls[0][0]).toMatch(/\/watched$/)
    expect(up.mock.calls[0][1].params).toEqual({ next: '1000004' })
    expect(r.json).toMatchObject({ error: false, next: '1000001' })
    expect(r.json.list).toHaveLength(3)
  })

  it('upstream cookies: site cookies + nw=1 only, never app cookies', async () => {
    const up = mockUpstream(async () => html(fixture('list-compact.html')))
    await get('/api/gallery?f_search=cookies', {
      cookie: COOKIE + '; _ga=GA1.2.3; NEXT_LOCALE=en',
    })
    const sent = up.mock.calls[0][1].headers.Cookie
    expect(sent).toMatch(/nw=1/)
    expect(sent).not.toMatch(/_ga|NEXT_LOCALE/)
  })
})
