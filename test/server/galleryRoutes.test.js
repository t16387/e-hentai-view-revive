import { afterEach, describe, expect, it, vi } from 'vitest'
import { require, fixture } from './helpers'
const axios = require('../../server/src/axios')
const router = require('../../server/src/gallery/galleryRouter')

const route = (path) =>
  router.stack.find((l) => l.route && l.route.path === path).route.stack[0]
    .handle
function fakeRes() {
  const res = { statusCode: 200, body: undefined }
  res.status = (c) => ((res.statusCode = c), res)
  res.json = (b) => ((res.body = b), res)
  return res
}
const cookies = { ipb_member_id: '1', ipb_pass_hash: 'x' }

describe('gallery routes validate gid / token before going upstream', () => {
  afterEach(() => vi.restoreAllMocks())

  it.each([
    ['/:gid/:token', { gid: '..', token: '..' }],
    ['/:gid/:token', { gid: '../../uconfig.php?x=', token: 'ab' }],
    ['/:gid/:token', { gid: '1', token: '../../home.php' }],
    ['/:gid/:token/torrent', { gid: '../../uconfig.php', token: 'ab' }],
    ['/:gid/:token/torrent', { gid: '1', token: 'ab?x=1' }],
    ['/:gid/:token/:p', { gid: '1', token: 'ab', p: '1x' }],
    ['/:gid/:token/:p', { gid: '1', token: 'ab', p: '-1' }],
    ['/:gid/:token/:p', { gid: '1', token: 'zz', p: '0' }],
  ])('%s %o -> 400, no upstream request', async (path, params) => {
    const get = vi.spyOn(axios, 'get')
    const res = fakeRes()
    await route(path)({ params, query: {}, cookies }, res)
    expect(res.statusCode).toBe(400)
    expect(get).not.toHaveBeenCalled()
  })

  it('a valid detail request still goes to /g/<gid>/<token>/', async () => {
    const get = vi.spyOn(axios, 'get').mockResolvedValue({
      status: 200,
      headers: { 'content-type': 'text/html' },
      data: fixture('detail-large-p0.html'),
    })
    const res = fakeRes()
    await route('/:gid/:token')(
      { params: { gid: '123', token: 'abcdef0123' }, query: {}, cookies },
      res
    )
    expect(get.mock.calls[0][0]).toMatch(/\/g\/123\/abcdef0123\/$/)
    expect(res.statusCode).toBe(200)
    expect(res.body.thumbPages.perPage).toBeGreaterThan(0)
  })
})
