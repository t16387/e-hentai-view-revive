import { afterEach, describe, expect, it, vi } from 'vitest'
import { require } from './helpers'

// isolate env
const flarePath = require.resolve('../../server/src/user/flareSolverr')

describe('flareSolverr helpers', () => {
  afterEach(() => {
    delete process.env.EHV_FLARESOLVERR_URL
    vi.resetModules()
  })

  it('isConfigured reflects EHV_FLARESOLVERR_URL', () => {
    delete process.env.EHV_FLARESOLVERR_URL
    vi.resetModules()
    let flare = require('../../server/src/user/flareSolverr')
    expect(flare.isConfigured()).toBe(false)
    process.env.EHV_FLARESOLVERR_URL = 'http://127.0.0.1:8191/v1'
    vi.resetModules()
    flare = require('../../server/src/user/flareSolverr')
    expect(flare.isConfigured()).toBe(true)
    expect(flare.flaresolverrUrl()).toBe('http://127.0.0.1:8191/v1')
  })

  it('cookiesFromSolution maps name/value pairs', () => {
    process.env.EHV_FLARESOLVERR_URL = 'http://x/v1'
    vi.resetModules()
    const flare = require('../../server/src/user/flareSolverr')
    const obj = flare.cookiesFromSolution({
      cookies: [
        { name: 'ipb_member_id', value: '1' },
        { name: 'cf_clearance', value: 'abc' },
      ],
    })
    expect(obj).toEqual({ ipb_member_id: '1', cf_clearance: 'abc' })
    expect(flare.cookieHeaderFromObj(obj)).toMatch(/ipb_member_id=1/)
  })
})
