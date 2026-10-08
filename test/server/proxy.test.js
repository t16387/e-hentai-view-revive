import { afterEach, describe, expect, it, vi } from 'vitest'
import { require } from './helpers'
import { PassThrough } from 'node:stream'
const axios = require('../../server/src/axios')
const router = require('../../server/src/gallery/galleryRouter')

const handler = router.stack.find((l) => l.route && l.route.path === '/proxy')
  .route.stack[0].handle
function fakeRes() {
  const res = new PassThrough()
  res.headers = {}
  res.statusCode = 200
  res.setHeader = (k, v) => (res.headers[k] = v)
  res.status = (c) => ((res.statusCode = c), res)
  res.send = vi.fn(() => res.end())
  return res
}
const fakeReq = (url) =>
  Object.assign(new PassThrough(), {
    query: { url },
    cookies: { ipb_member_id: '1', igneous: 'x' },
  })
const flush = () => new Promise((r) => setTimeout(r, 0))

describe('/api/gallery/proxy', () => {
  afterEach(() => vi.restoreAllMocks())

  it('refuses hosts outside the allowlist', async () => {
    const res = fakeRes()
    await handler(fakeReq('https://example.com/a.jpg'), res)
    expect(res.statusCode).toBe(400)
  })

  it('refuses a host the legacy url parser reads differently (no cookies to evil.test)', async () => {
    const get = vi.spyOn(axios, 'get')
    for (const url of [
      'https://evil.test;.exhentai.org/x.jpg',
      'http://127.0.0.1%2eehgt.org/x.jpg',
    ]) {
      const res = fakeRes()
      await handler(fakeReq(url), res)
      expect(res.statusCode).toBe(400)
    }
    expect(get).not.toHaveBeenCalled()
  })

  it('passes the canonical (checked) URL to axios, not the raw query', async () => {
    const get = vi
      .spyOn(axios, 'get')
      .mockResolvedValue({ data: new PassThrough(), headers: {} })
    const res = fakeRes()
    await handler(fakeReq('https://EHGT.org/w/x y.webp'), res)
    await flush()
    expect(get.mock.calls[0][0]).toBe('https://ehgt.org/w/x%20y.webp')
  })

  it('loadImg refuses spoofed image page hosts before any request', async () => {
    const loadImg = router.stack.find(
      (l) => l.route && l.route.path === '/loadImg'
    ).route.stack[0].handle
    const get = vi.spyOn(axios, 'get')
    const res = fakeRes()
    res.json = vi.fn(() => res.end())
    await loadImg(fakeReq('https://evil.test;.exhentai.org/s/ab/1-1'), res)
    expect(res.statusCode).toBe(400)
    expect(get).not.toHaveBeenCalled()
  })

  it('an unreachable H@H node fails fast with 504 (reader then retries with nl=)', async () => {
    const get = vi.spyOn(axios, 'get').mockRejectedValue(
      Object.assign(new Error('timeout of 20000ms exceeded'), {
        code: 'ECONNABORTED',
      })
    )
    const res = fakeRes()
    await handler(
      fakeReq('https://abcd.efgh.hath.network:52018/h/x/keystamp=1/1.jpg'),
      res
    )
    await flush()
    expect(get.mock.calls[0][1].timeout).toBeGreaterThan(0)
    expect(get.mock.calls[0][1].headers).toEqual({})
    expect(res.statusCode).toBe(504)
  })

  it('streams an image and sends cookies only to the site itself', async () => {
    const body = new PassThrough()
    const get = vi.spyOn(axios, 'get').mockResolvedValue({
      data: body,
      headers: { 'content-type': 'image/webp', 'set-cookie': ['a=b'] },
    })
    const res = fakeRes()
    await handler(fakeReq('https://s.exhentai.org/t/aa/bb/x.webp'), res)
    await flush()
    body.end(Buffer.from('img'))
    await flush()
    expect(res.headers['content-type']).toBe('image/webp')
    expect(res.headers['set-cookie']).toBeUndefined()
    expect(get.mock.calls[0][1].headers.Cookie).toMatch(/igneous=x/)
  })

  it('does not follow a redirect to a host outside the allowlist', async () => {
    const hop = new PassThrough()
    const get = vi.spyOn(axios, 'get').mockResolvedValueOnce({
      status: 302,
      data: hop,
      headers: { location: 'http://169.254.169.254/latest/meta-data/' },
    })
    const res = fakeRes()
    await handler(fakeReq('https://abcd.efgh.hath.network/h/x/1.jpg'), res)
    await flush()
    expect(get).toHaveBeenCalledTimes(1)
    expect(get.mock.calls[0][1].maxRedirects).toBe(0)
    expect(hop.destroyed).toBe(true)
    expect(res.statusCode).toBe(502)
  })

  it('follows an allowlisted redirect, re-deciding cookies per hop', async () => {
    const body = new PassThrough()
    const get = vi
      .spyOn(axios, 'get')
      .mockResolvedValueOnce({
        status: 302,
        data: new PassThrough(),
        headers: { location: 'https://abcd.efgh.hath.network:4433/h/k/1.jpg' },
      })
      .mockResolvedValueOnce({
        status: 200,
        data: body,
        headers: { 'content-type': 'image/jpeg' },
      })
    const res = fakeRes()
    await handler(fakeReq('https://exhentai.org/fullimg/1/1/x/1.jpg'), res)
    await flush()
    body.end(Buffer.from('img'))
    await flush()
    expect(get).toHaveBeenCalledTimes(2)
    expect(get.mock.calls[0][1].headers.Cookie).toMatch(/igneous=x/)
    expect(get.mock.calls[1][0]).toBe(
      'https://abcd.efgh.hath.network:4433/h/k/1.jpg'
    )
    expect(get.mock.calls[1][1].headers).toEqual({})
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toBe('image/jpeg')
  })

  it('stops after two redirect hops and refuses spoofed redirect hosts', async () => {
    const hop = (location) => ({
      status: 301,
      data: new PassThrough(),
      headers: { location },
    })
    let get = vi
      .spyOn(axios, 'get')
      .mockResolvedValue(hop('https://ehgt.org/loop.jpg'))
    let res = fakeRes()
    await handler(fakeReq('https://ehgt.org/a.jpg'), res)
    await flush()
    expect(get).toHaveBeenCalledTimes(3)
    expect(res.statusCode).toBe(502)
    vi.restoreAllMocks()

    get = vi
      .spyOn(axios, 'get')
      .mockResolvedValue(hop('https://evil.test;.exhentai.org/x'))
    res = fakeRes()
    await handler(fakeReq('https://ehgt.org/a.jpg'), res)
    await flush()
    expect(get).toHaveBeenCalledTimes(1)
    expect(res.statusCode).toBe(502)
  })

  it('never sends cookies over plain http, even to the site', async () => {
    const get = vi
      .spyOn(axios, 'get')
      .mockResolvedValue({ data: new PassThrough(), headers: {} })
    const res = fakeRes()
    await handler(fakeReq('http://exhentai.org/t/aa/bb/x.jpg'), res)
    await flush()
    expect(get.mock.calls[0][1].headers).toEqual({})
  })

  it('a client that disconnects before the image host answers cancels the request', async () => {
    let resolve
    const get = vi
      .spyOn(axios, 'get')
      .mockReturnValue(new Promise((r) => (resolve = r)))
    const res = fakeRes()
    await handler(fakeReq('https://abcd.efgh.hath.network/h/x/1.jpg'), res)
    res.destroy() // browser gave up while the H@H node was still connecting
    await flush()
    const token = get.mock.calls[0][1].cancelToken
    expect(token && token.reason).toBeTruthy()
    const body = new PassThrough()
    resolve({ status: 200, data: body, headers: {} })
    await flush()
    expect(body.destroyed).toBe(true)
    expect(res.send).not.toHaveBeenCalled()
  })

  it('a client that disconnects mid-stream destroys the upstream stream', async () => {
    const body = new PassThrough()
    vi.spyOn(axios, 'get').mockResolvedValue({
      status: 200,
      data: body,
      headers: { 'content-type': 'image/jpeg' },
    })
    const res = fakeRes()
    await handler(fakeReq('https://abcd.efgh.hath.network/h/x/1.jpg'), res)
    await flush()
    body.write(Buffer.from('partial'))
    res.destroy()
    await flush()
    expect(body.destroyed).toBe(true)
  })

  it('an upstream stream error mid-transfer closes the response', async () => {
    const body = new PassThrough()
    vi.spyOn(axios, 'get').mockResolvedValue({ data: body, headers: {} })
    const res = fakeRes()
    await handler(fakeReq('https://ehgt.org/x.jpg'), res)
    await flush()
    body.destroy(new Error('aborted'))
    await flush()
    expect(res.destroyed).toBe(true)
  })
})
