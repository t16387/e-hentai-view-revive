import { afterEach, describe, expect, it, vi } from 'vitest'
import { require, fixture } from './helpers'
const axios = require('../../server/src/axios')
const { userCacheScope } = require('../../server/src/utils/cookies')

const route = (router, method, path) =>
  router.stack.find(
    (l) => l.route && l.route.path === path && l.route.methods[method]
  ).route.stack[0].handle

function fakeRes() {
  const res = { statusCode: 200, body: undefined }
  res.status = (c) => ((res.statusCode = c), res)
  res.json = (b) => ((res.body = b), res)
  return res
}
const page = (html) => ({
  status: 200,
  headers: { 'content-type': 'text/html' },
  data: html,
})

const victim = { ipb_member_id: '1001', ipb_pass_hash: 'aaaa', igneous: 'bb' }
// same (guessable) member id, but not the victim's credentials
const attacker = { ipb_member_id: '1001', ipb_pass_hash: 'zzzz' }

describe('per-user caches are keyed by the credentials, not the member id', () => {
  afterEach(() => vi.restoreAllMocks())

  it('userCacheScope', () => {
    expect(userCacheScope(victim)).toBe(userCacheScope({ ...victim }))
    expect(userCacheScope(victim)).not.toBe(userCacheScope(attacker))
    expect(userCacheScope({})).toBe('anon')
    expect(userCacheScope(undefined)).toBe('anon')
    // the scope never contains the cookie values themselves
    expect(userCacheScope(victim)).not.toMatch(/1001|aaaa/)
    expect(userCacheScope(victim)).toMatch(/^[0-9a-f]{32}$/)
  })

  it.each([
    [
      'favorites',
      '../../server/src/favorites/favoritesRouter',
      { favcat: '3' },
    ],
    ['watched', '../../server/src/watched/watchedRouter', { f_search: 'w' }],
    ['gallery', '../../server/src/gallery/galleryRouter', { f_search: 'g' }],
  ])(
    '%s: a client spoofing ipb_member_id does not get the cached list',
    async (_name, mod, query) => {
      const handler = route(require(mod), 'get', '/')
      const get = vi
        .spyOn(axios, 'get')
        .mockResolvedValue(page(fixture('list-compact.html')))
      await handler({ query, cookies: victim }, fakeRes())
      expect(get).toHaveBeenCalledTimes(1)
      // same member id, other credentials: must go upstream with its own cookies
      await handler({ query, cookies: attacker }, fakeRes())
      expect(get).toHaveBeenCalledTimes(2)
      expect(get.mock.calls[1][1].headers.Cookie).toMatch(/ipb_pass_hash=zzzz/)
      // the real user is still served from the cache
      const res = fakeRes()
      await handler({ query, cookies: { ...victim } }, res)
      expect(get).toHaveBeenCalledTimes(2)
      expect(res.body.list.length).toBeGreaterThan(0)
    }
  )

  it('popular is cached per user as well', async () => {
    const handler = route(
      require('../../server/src/popular/popularRouter'),
      'get',
      '/'
    )
    const get = vi
      .spyOn(axios, 'get')
      .mockResolvedValue(page(fixture('list-compact.html')))
    await handler({ query: {}, cookies: victim }, fakeRes())
    await handler({ query: {}, cookies: attacker }, fakeRes())
    expect(get).toHaveBeenCalledTimes(2)
  })
})
