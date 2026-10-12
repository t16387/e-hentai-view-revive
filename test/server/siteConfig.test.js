import { afterEach, describe, expect, it, vi } from 'vitest'
import { require } from './helpers'

const {
  DEFAULT_SITE,
  normalizeSiteName,
  getSiteConfig,
  resolveSiteNameFromReq,
  envSiteName,
  runWithSite,
  getSite,
} = require('../../server/src/config/api')

describe('site config', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('defaults to e-hentai', () => {
    expect(DEFAULT_SITE).toBe('e-hentai')
    expect(getSiteConfig().siteName).toBe(envSiteName())
    expect(getSiteConfig().baseURL).toMatch(/e-hentai\.org/)
  })

  it('normalizes known ids only', () => {
    expect(normalizeSiteName('exhentai')).toBe('exhentai')
    expect(normalizeSiteName('e-hentai')).toBe('e-hentai')
    expect(normalizeSiteName('EXHENTAI')).toBe('exhentai')
    expect(normalizeSiteName('nope')).toBeNull()
    expect(normalizeSiteName(null)).toBeNull()
  })

  it('builds exhentai URLs and requires login', () => {
    const s = getSiteConfig('exhentai')
    expect(s.baseURL).toBe('https://exhentai.org')
    expect(s.baseApiURL).toBe('https://s.exhentai.org/api.php')
    expect(s.requiresLogin).toBe(true)
    expect(s.popularURL).toBe('https://exhentai.org/popular')
  })

  it('resolves header over cookie over env', () => {
    vi.stubEnv('EHV_SITE', 'e-hentai')
    const req = {
      get: (n) => (n === 'x-ehv-site' ? 'exhentai' : undefined),
      cookies: { ehv_site: 'e-hentai' },
      headers: {},
    }
    expect(resolveSiteNameFromReq(req)).toBe('exhentai')
    expect(
      resolveSiteNameFromReq({
        get: () => undefined,
        cookies: { ehv_site: 'exhentai' },
        headers: {},
      })
    ).toBe('exhentai')
    expect(
      resolveSiteNameFromReq({
        get: () => undefined,
        cookies: {},
        headers: {},
      })
    ).toBe('e-hentai')
  })

  it('runWithSite scopes getSite for the request', () => {
    const exo = getSiteConfig('exhentai')
    runWithSite(exo, () => {
      expect(getSite().siteName).toBe('exhentai')
      expect(getSite().baseURL).toBe('https://exhentai.org')
    })
    expect(getSite().siteName).toBe(envSiteName())
  })
})
