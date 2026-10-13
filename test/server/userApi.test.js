import { afterEach, describe, expect, it, vi } from 'vitest'
import { require } from './helpers'
const axios = require('../../server/src/axios')
const {
  login,
  validateLogin,
  attachIgneous,
  fetchIgneous,
} = require('../../server/src/user/userApi')

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

describe('login behind the forums Cloudflare challenge (exhentai validation)', () => {
  afterEach(() => vi.restoreAllMocks())

  it('password login reports the challenge instead of a parse failure', async () => {
    vi.spyOn(axios, 'request').mockResolvedValue(CHALLENGE)
    await expect(login({ UserName: 'x', PassWord: 'y' })).rejects.toMatchObject(
      { code: 'cloudflare' }
    )
  })

  it('password login requires username and password', async () => {
    await expect(login({ UserName: '', PassWord: 'y' })).rejects.toMatchObject({
      code: 'validation',
    })
  })

  it('password login parses success and attaches igneous when possible', async () => {
    const html =
      'You are now logged in as: alice<br />Enjoy your stay!'
    vi.spyOn(axios, 'request').mockResolvedValue({
      status: 200,
      data: html,
      headers: {
        'set-cookie': [
          'ipb_member_id=42; Path=/',
          'ipb_pass_hash=abcd; Path=/',
        ],
      },
    })
    vi.spyOn(axios, 'get').mockResolvedValue({
      status: 200,
      data: '',
      headers: { 'set-cookie': ['igneous=fromexh; Path=/'] },
    })
    const result = await login({ UserName: 'alice', PassWord: 'secret' })
    expect(result.message).toMatch(/logged in as: alice/)
    expect(result.cookie.ipb_member_id).toBe('42')
    expect(result.cookie.ipb_pass_hash).toBe('abcd')
    expect(result.cookie.igneous).toBe('fromexh')
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
    await expect(validateLogin(fake, 'exhentai')).resolves.toMatch(
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
    await expect(validateLogin(fake, 'exhentai')).rejects.toMatchObject({
      code: 'sad panda',
    })
  })

  it('forums unreachable (network error) also falls back', async () => {
    vi.spyOn(axios, 'get')
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValueOnce({ status: 200, data: INDEX, headers: {} })
    await expect(validateLogin(fake, 'exhentai')).resolves.toMatch(/verified/)
  })

  it('attachIgneous leaves existing igneous alone', async () => {
    const spy = vi.spyOn(axios, 'get')
    const out = await attachIgneous({
      ipb_member_id: '1',
      ipb_pass_hash: 'x',
      igneous: 'keep',
    })
    expect(out.igneous).toBe('keep')
    expect(spy).not.toHaveBeenCalled()
  })

  it('fetchIgneous returns null on Cloudflare during redirect', async () => {
    vi.spyOn(axios, 'get').mockResolvedValue({
      status: 302,
      headers: {
        location: 'https://forums.e-hentai.org/remoteapi.php?ex=1',
        'cf-mitigated': 'challenge',
      },
      data: '<title>Just a moment...</title>',
    })
    await expect(
      fetchIgneous({ ipb_member_id: '1', ipb_pass_hash: 'x' })
    ).resolves.toBeNull()
  })
})
