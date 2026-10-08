import { afterEach, describe, expect, it, vi } from 'vitest'
import { doc, require } from './helpers'
const axios = require('../../server/src/axios')
const {
  fetchPage,
  classifyBadPage,
  isCloudflareChallenge,
} = require('../../server/src/utils/fetchPage')
const { listFromDocument } = require('../../server/src/gallery/listPage')
const { GalleryMode } = require('../../server/src/constant')

const page = (status, data, headers = {}) => ({ status, data, headers })
const HTML = '<html><body><div class="itg gld"></div></body></html>'

describe('classifyBadPage', () => {
  it.each([
    ['empty 200 body (exhentai sad panda)', page(200, ''), 'sad panda'],
    ['whitespace-only body', page(200, ' \n'), 'sad panda'],
    [
      'image instead of page',
      page(200, 'GIF89a', { 'content-type': 'image/gif' }),
      'sad panda',
    ],
    [
      'igneous=mystery',
      page(200, HTML, {
        'set-cookie': ['igneous=mystery; path=/; domain=.exhentai.org'],
      }),
      'sad panda',
    ],
    [
      'redirect away (exhentai)',
      page(302, '', { location: 'https://e-hentai.org/' }),
      'sad panda',
    ],
    [
      'cloudflare header',
      page(403, 'x', { 'cf-mitigated': 'challenge' }),
      'cloudflare',
    ],
    [
      'cloudflare body',
      page(503, '<title>Just a moment...</title>'),
      'cloudflare',
    ],
    [
      'ip ban',
      page(
        200,
        'Your IP address has been temporarily banned for excessive pageloads'
      ),
      'banned',
    ],
    ['404', page(404, 'nope'), '404'],
    [
      'wrong token',
      page(200, 'Key missing, or incorrect key provided.'),
      '404',
    ],
    ['5xx', page(500, 'x'), 'http 500'],
  ])('%s -> %s', (_, res, code) => {
    expect(classifyBadPage(res, { siteName: 'exhentai' }).code).toBe(code)
  })

  it('a redirect on e-hentai is not called a sad panda', () => {
    expect(
      classifyBadPage(page(302, '', { location: '/x' }), {
        siteName: 'e-hentai',
      }).code
    ).toBe('redirect')
  })

  it('a normal page passes', () => {
    expect(
      classifyBadPage(page(200, HTML, { 'content-type': 'text/html' }))
    ).toBeNull()
  })

  it('isCloudflareChallenge ignores ordinary 403s', () => {
    expect(isCloudflareChallenge(page(403, 'Forbidden'))).toBe(false)
  })
})

describe('fetchPage', () => {
  afterEach(() => vi.restoreAllMocks())

  it('returns a document and never follows redirects by itself', async () => {
    const get = vi.spyOn(axios, 'get').mockResolvedValue(page(200, HTML))
    const { document } = await fetchPage('https://exhentai.org/', {
      cookies: 'a=b',
      params: { next: '1' },
    })
    expect(document.querySelector('.itg')).not.toBeNull()
    const [url, opts] = get.mock.calls[0]
    expect(url).toBe('https://exhentai.org/')
    expect(opts).toMatchObject({
      params: { next: '1' },
      headers: { Cookie: 'a=b' },
      maxRedirects: 0,
    })
    expect(opts.validateStatus(500)).toBe(true)
  })

  it('follows a same-host redirect', async () => {
    const get = vi
      .spyOn(axios, 'get')
      .mockResolvedValueOnce(page(301, '', { location: '/g/1/a/' }))
      .mockResolvedValueOnce(page(200, HTML))
    await fetchPage('https://exhentai.org/g/1/a')
    expect(get).toHaveBeenCalledTimes(2)
    expect(get.mock.calls[1][0]).toBe('https://exhentai.org/g/1/a/')
  })

  it('treats a redirect to another host as a sad panda', async () => {
    const get = vi
      .spyOn(axios, 'get')
      .mockResolvedValue(page(302, '', { location: 'https://e-hentai.org/' }))
    await expect(
      fetchPage('https://exhentai.org/', { siteName: 'exhentai' })
    ).rejects.toMatchObject({ code: 'sad panda' })
    expect(get).toHaveBeenCalledTimes(1)
  })

  it('stops after a few redirect hops', async () => {
    const get = vi
      .spyOn(axios, 'get')
      .mockResolvedValue(page(302, '', { location: '/loop' }))
    await expect(fetchPage('https://exhentai.org/')).rejects.toMatchObject({
      code: 'sad panda',
    })
    expect(get).toHaveBeenCalledTimes(3)
  })

  it('rejects the blank sad panda page instead of returning a document', async () => {
    vi.spyOn(axios, 'get').mockResolvedValue(page(200, ''))
    const err = await fetchPage('https://exhentai.org/').catch((e) => e)
    expect(err.code).toBe('sad panda')
    expect(err.message).toMatch(/^\[sad panda\] /)
  })
})

describe('listFromDocument', () => {
  it('a real "no hits" page is an empty list', () => {
    expect(
      listFromDocument(doc('list-nohits.html'), GalleryMode.FrontPage)
    ).toMatchObject({ list: [], next: null, total: 0 })
  })

  it('a page without any gallery list is an error, not []', () => {
    const blank = new (require('jsdom').JSDOM)(
      '<html><body><p>something else</p></body></html>'
    ).window.document
    expect(() => listFromDocument(blank, GalleryMode.FrontPage)).toThrow(
      /no gallery list/
    )
  })

  it('exhentai thumbnail mode (profile without tags, unrated gallery)', () => {
    const res = listFromDocument(
      doc('list-thumbnail-exh.html'),
      GalleryMode.FrontPage
    )
    expect(res.displayMode).toBe('thumbnail')
    expect(res.next).toBe('4000001')
    expect(res.prev).toBeNull()
    expect(res.list).toHaveLength(2)
    expect(res.list[0]).toMatchObject({
      gid: '4000002',
      token: 'dddddddddd',
      category: 'Misc',
      filecount: 12,
      rating: 4.5,
      tags: [],
    })
    expect(res.list[0].thumb).toMatch(/^https:\/\/s\.exhentai\.org\//)
    expect(res.list[1]).toMatchObject({
      gid: '4000001',
      category: 'Non-H',
      filecount: 1,
      rating: 0,
    })
  })
})
