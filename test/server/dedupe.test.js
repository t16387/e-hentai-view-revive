/**
 * Request coalescing and short caches (UAT: each image page was fetched
 * 5-6 times, favorites info / torrents ~11 times per gallery view).
 * Real express app over HTTP, upstream mocked: no network.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import http from 'node:http'
import { require, fixture } from './helpers'

const express = require('express')
const axios = require('../../server/src/axios')
const { coalesce, cached, inflightCount } = require('../../server/src/utils/coalesce')

let server
let base
let n = 0
// a different fake login per test, so per-user caches never leak between tests
const cookie = () => `ipb_member_id=${++n}; ipb_pass_hash=${'0'.repeat(31)}${n % 10}; igneous=fake${n}`
beforeAll(async () => {
  vi.spyOn(express.application, 'listen').mockImplementation(() => null)
  const app = require('../../server/src/app')
  server = http.createServer(app)
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  base = `http://127.0.0.1:${server.address().port}`
})
afterAll(() => new Promise((r) => server.close(r)))
afterEach(() => vi.restoreAllMocks())

const html = (data) => ({ status: 200, headers: { 'content-type': 'text/html; charset=UTF-8' }, data })
const slow = (value, ms = 30) => new Promise((r) => setTimeout(() => r(value), ms))
const get = (path, c) => fetch(base + path, { headers: { cookie: c } }).then((r) => r.json())
const imgPage = (n) => encodeURIComponent(`https://exhentai.org/s/0a1b2c3d4e/1000001-${n}`)

describe('coalesce / cached', () => {
  it('concurrent callers share one call; the next call after it settles runs again', async () => {
    const fn = vi.fn(() => slow('v'))
    const r = await Promise.all([coalesce('k1', fn), coalesce('k1', fn), coalesce('k1', fn)])
    expect(r).toEqual(['v', 'v', 'v'])
    expect(fn).toHaveBeenCalledTimes(1)
    expect(inflightCount()).toBe(0)
    await coalesce('k1', fn)
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('errors reach every waiting caller and are not cached', async () => {
    let calls = 0
    const fn = () => { calls++; return slow(null).then(() => { throw new Error('boom') }) }
    const r = await Promise.allSettled([cached('k2', 60, fn), cached('k2', 60, fn)])
    expect(r.map((x) => x.status)).toEqual(['rejected', 'rejected'])
    expect(calls).toBe(1)
    await cached('k2', 60, () => slow('ok'))
    expect(await cached('k2', 60, fn)).toBe('ok')
    expect(calls).toBe(1)
  })
})

describe('API dedupe', () => {
  it('a burst of identical image page lookups makes one upstream request', async () => {
    const up = vi.spyOn(axios, 'get').mockImplementation(() => slow(html(fixture('image-page.html'))))
    const c = cookie()
    const r = await Promise.all(Array.from({ length: 6 }, () => get('/api/gallery/loadImg?url=' + imgPage(7), c)))
    expect(up).toHaveBeenCalledTimes(1)
    expect(r.every((x) => x.error === false && x.url.includes('.hath.network'))).toBe(true)
  })

  it('lookups of different users are not merged', async () => {
    const up = vi.spyOn(axios, 'get').mockImplementation(() => slow(html(fixture('image-page.html'))))
    await Promise.all([get('/api/gallery/loadImg?url=' + imgPage(8), cookie()), get('/api/gallery/loadImg?url=' + imgPage(8), cookie())])
    expect(up).toHaveBeenCalledTimes(2)
  })

  it('an image page pointing outside the image host allowlist is refused', async () => {
    const page = fixture('image-page.html').replace(/id="img" src="[^"]+"/, 'id="img" src="https://evil.test/x.jpg"')
    vi.spyOn(axios, 'get').mockImplementation(async () => html(page))
    const r = await get('/api/gallery/loadImg?url=' + imgPage(9), cookie())
    expect(r).toMatchObject({ error: true })
    expect(JSON.stringify(r)).not.toContain('evil.test')
  })

  it('gallery detail: concurrent and repeated views within 30 s hit upstream once', async () => {
    const up = vi.spyOn(axios, 'get').mockImplementation(() => slow(html(fixture('detail-large-p0.html'))))
    const c = cookie()
    await Promise.all([get('/api/gallery/1000001/abcdef0123', c), get('/api/gallery/1000001/abcdef0123', c)])
    await get('/api/gallery/1000001/abcdef0123', c)
    expect(up).toHaveBeenCalledTimes(1)
    // and the reader's page 0 comes from that same fetch
    const p0 = await get('/api/gallery/1000001/abcdef0123/0', c)
    expect(p0.error).toBe(false)
    expect(up).toHaveBeenCalledTimes(1)
  })

  it('favorites info is cached per user and dropped when a favorite changes', async () => {
    const up = vi.spyOn(axios, 'get').mockImplementation(() => slow(html(fixture('favorites-p2.html'))))
    const c = cookie()
    for (let k = 0; k < 3; k++) await get('/api/favorites/info', c)
    expect(up).toHaveBeenCalledTimes(1)
    const post = vi.spyOn(axios, 'request').mockResolvedValue({ status: 200, headers: {}, data: '' })
    await fetch(base + '/api/favorites/add/1000001/abcdef0123?favcat=1', { method: 'PUT', headers: { cookie: c } })
    expect(post).toHaveBeenCalled()
    await get('/api/favorites/info', c)
    expect(up).toHaveBeenCalledTimes(2)
  })
})
