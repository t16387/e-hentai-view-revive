// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { LOCAL_EHV_SITE } from '@/constant'
import {
  DEFAULT_EHV_SITE,
  normalizeEhvSite,
  readEhvSite,
  writeEhvSite,
} from '@/utils/sitePrefs'

afterEach(() => {
  localStorage.removeItem(LOCAL_EHV_SITE)
})

describe('sitePrefs', () => {
  it('defaults to e-hentai when unset', () => {
    expect(readEhvSite()).toBe(DEFAULT_EHV_SITE)
    expect(DEFAULT_EHV_SITE).toBe('e-hentai')
  })

  it('normalizes known ids and falls back otherwise', () => {
    expect(normalizeEhvSite('e-hentai')).toBe('e-hentai')
    expect(normalizeEhvSite('exhentai')).toBe('exhentai')
    expect(normalizeEhvSite('nope')).toBe('e-hentai')
    expect(normalizeEhvSite(null)).toBe('e-hentai')
    expect(normalizeEhvSite(undefined)).toBe('e-hentai')
  })

  it('reads and writes the string id', () => {
    writeEhvSite('exhentai')
    expect(localStorage.getItem(LOCAL_EHV_SITE)).toBe('exhentai')
    expect(readEhvSite()).toBe('exhentai')
    writeEhvSite('e-hentai')
    expect(readEhvSite()).toBe('e-hentai')
  })

  it('ignores unknown stored values', () => {
    localStorage.setItem(LOCAL_EHV_SITE, 'other')
    expect(readEhvSite()).toBe('e-hentai')
  })
})
