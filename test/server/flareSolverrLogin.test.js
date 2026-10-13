import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { require } from './helpers'

const axiosApp = require('../../server/src/axios')
const Axios = require('axios').default
const flare = require('../../server/src/user/flareSolverr')
const { login } = require('../../server/src/user/userApi')

const SUCCESS_HTML = 'You are now logged in as: alice<br />Enjoy!'

describe('password login via FlareSolverr', () => {
  beforeEach(() => {
    process.env.EHV_FLARESOLVERR_URL = 'http://flaresolverr.test/v1'
  })
  afterEach(() => {
    delete process.env.EHV_FLARESOLVERR_URL
    vi.restoreAllMocks()
  })

  it('uses request.post when FlareSolverr returns session cookies', async () => {
    const post = vi.spyOn(Axios, 'create').mockReturnValue({
      post: vi.fn().mockResolvedValue({
        status: 200,
        data: {
          status: 'ok',
          solution: {
            url: 'https://forums.e-hentai.org/',
            status: 200,
            cookies: [
              { name: 'ipb_member_id', value: '42' },
              { name: 'ipb_pass_hash', value: 'abcd' },
            ],
            userAgent: 'UA',
            headers: {},
            response: SUCCESS_HTML,
          },
        },
      }),
    })
    // flareSolverr module already created rawAxios at load — spy callFlareSolverr instead
    post.mockRestore()
    vi.spyOn(flare, 'solverPost').mockResolvedValue({
      html: SUCCESS_HTML,
      cookies: { ipb_member_id: '42', ipb_pass_hash: 'abcd' },
      userAgent: 'UA',
      status: 200,
      url: 'https://forums.e-hentai.org/',
    })
    vi.spyOn(flare, 'isConfigured').mockReturnValue(true)
    vi.spyOn(axiosApp, 'get').mockResolvedValue({
      status: 200,
      data: '',
      headers: {},
    })

    const result = await login({ UserName: 'alice', PassWord: 'secret' })
    expect(result.message).toMatch(/logged in as: alice/)
    expect(result.cookie.ipb_member_id).toBe('42')
    expect(flare.solverPost).toHaveBeenCalled()
  })

  it('does not return cloudflare when solver fails — flaresolverr code instead', async () => {
    vi.spyOn(flare, 'isConfigured').mockReturnValue(true)
    vi.spyOn(flare, 'solverPost').mockRejectedValue(
      Object.assign(new Error('[flaresolverr] timeout'), { code: 'flaresolverr' })
    )
    vi.spyOn(flare, 'createSession').mockRejectedValue(
      Object.assign(new Error('[flaresolverr] timeout'), { code: 'flaresolverr' })
    )
    vi.spyOn(flare, 'solverGet').mockRejectedValue(
      Object.assign(new Error('[flaresolverr] timeout'), { code: 'flaresolverr' })
    )
    vi.spyOn(flare, 'destroySession').mockResolvedValue(undefined)

    await expect(
      login({ UserName: 'alice', PassWord: 'secret' })
    ).rejects.toMatchObject({ code: 'flaresolverr' })
  })

  it('falls back to direct POST (cloudflare) when solver URL unset', async () => {
    delete process.env.EHV_FLARESOLVERR_URL
    vi.spyOn(flare, 'isConfigured').mockReturnValue(false)
    vi.spyOn(axiosApp, 'request').mockResolvedValue({
      status: 403,
      data: '<title>Just a moment...</title>',
      headers: { 'cf-mitigated': 'challenge' },
    })
    await expect(
      login({ UserName: 'alice', PassWord: 'secret' })
    ).rejects.toMatchObject({ code: 'cloudflare' })
  })
})
