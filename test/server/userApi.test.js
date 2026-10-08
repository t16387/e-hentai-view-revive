import { afterEach, describe, expect, it, vi } from 'vitest'
import { require } from './helpers'
const axios = require('../../server/src/axios')
const { login, validateLogin } = require('../../server/src/user/userApi')

const CHALLENGE = {
  status: 403,
  data: '<title>Just a moment...</title>',
  headers: { 'cf-mitigated': 'challenge' },
}
const INDEX =
  '<html><body><div id="searchbox"></div><div class="itg gld"></div></body></html>'
const fake = {
  ipb_member_id: '1',
  ipb_pass_hash: '0'.repeat(32),
  igneous: 'placeholder',
}

describe('login behind the forums Cloudflare challenge (default site exhentai)', () => {
  afterEach(() => vi.restoreAllMocks())

  it('password login reports the challenge instead of a parse failure', async () => {
    vi.spyOn(axios, 'request').mockResolvedValue(CHALLENGE)
    await expect(login({ UserName: 'x', PassWord: 'y' })).rejects.toMatchObject(
      { code: 'cloudflare' }
    )
  })

  it('cookie login falls back to a read-only check on exhentai', async () => {
    const get = vi
      .spyOn(axios, 'get')
      .mockResolvedValueOnce(CHALLENGE)
      .mockResolvedValueOnce({
        status: 200,
        data: INDEX,
        headers: { 'content-type': 'text/html' },
      })
    await expect(validateLogin(fake)).resolves.toMatch(
      /verified on exhentai\.org/
    )
    expect(get).toHaveBeenCalledTimes(2)
    const [url, opts] = get.mock.calls[1]
    expect(url).toBe('https://exhentai.org/')
    expect(opts.headers.Cookie).toMatch(/igneous=placeholder/)
    expect(opts.headers.Cookie).toMatch(/nw=1/)
  })

  it('rejected cookies (blank sad panda) fail the login', async () => {
    vi.spyOn(axios, 'get')
      .mockResolvedValueOnce(CHALLENGE)
      .mockResolvedValueOnce({
        status: 200,
        data: '',
        headers: { 'content-type': 'text/html' },
      })
    await expect(validateLogin(fake)).rejects.toMatchObject({
      code: 'sad panda',
    })
  })

  it('forums unreachable (network error) also falls back', async () => {
    vi.spyOn(axios, 'get')
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValueOnce({ status: 200, data: INDEX, headers: {} })
    await expect(validateLogin(fake)).resolves.toMatch(/verified/)
  })
})
