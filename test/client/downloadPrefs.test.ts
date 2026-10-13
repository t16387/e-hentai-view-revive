// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { LOCAL_SHOW_DOWNLOADS_NAV } from '@/constant'
import {
  readShowDownloadsNav,
  writeShowDownloadsNav,
} from '@/utils/downloadPrefs'

afterEach(() => {
  localStorage.removeItem(LOCAL_SHOW_DOWNLOADS_NAV)
})

describe('downloadPrefs', () => {
  it('defaults to true when unset', () => {
    expect(readShowDownloadsNav()).toBe(true)
  })

  it('reads and writes the string flag', () => {
    writeShowDownloadsNav(false)
    expect(localStorage.getItem(LOCAL_SHOW_DOWNLOADS_NAV)).toBe('false')
    expect(readShowDownloadsNav()).toBe(false)
    writeShowDownloadsNav(true)
    expect(localStorage.getItem(LOCAL_SHOW_DOWNLOADS_NAV)).toBe('true')
    expect(readShowDownloadsNav()).toBe(true)
  })

  it('ignores other truthy-looking values', () => {
    localStorage.setItem(LOCAL_SHOW_DOWNLOADS_NAV, '1')
    expect(readShowDownloadsNav()).toBe(false)
    localStorage.setItem(LOCAL_SHOW_DOWNLOADS_NAV, 'yes')
    expect(readShowDownloadsNav()).toBe(false)
  })
})
