// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { LOCAL_UI_THEME } from '@/constant'
import {
  DEFAULT_UI_THEME,
  normalizeUiTheme,
  readUiTheme,
  writeUiTheme,
} from '@/utils/uiThemePrefs'

afterEach(() => {
  localStorage.removeItem(LOCAL_UI_THEME)
})

describe('uiThemePrefs', () => {
  it('defaults to v4 when unset', () => {
    expect(readUiTheme()).toBe(DEFAULT_UI_THEME)
    expect(DEFAULT_UI_THEME).toBe('v4')
  })

  it('normalizes known ids and falls back otherwise', () => {
    expect(normalizeUiTheme('classic')).toBe('classic')
    expect(normalizeUiTheme('v3')).toBe('v3')
    expect(normalizeUiTheme('v4')).toBe('v4')
    expect(normalizeUiTheme('nope')).toBe('v4')
    expect(normalizeUiTheme(null)).toBe('v4')
    expect(normalizeUiTheme(undefined)).toBe('v4')
  })

  it('reads and writes the string id', () => {
    writeUiTheme('classic')
    expect(localStorage.getItem(LOCAL_UI_THEME)).toBe('classic')
    expect(readUiTheme()).toBe('classic')
    writeUiTheme('v3')
    expect(readUiTheme()).toBe('v3')
    writeUiTheme('v4')
    expect(readUiTheme()).toBe('v4')
  })

  it('ignores unknown stored values', () => {
    localStorage.setItem(LOCAL_UI_THEME, 'neon')
    expect(readUiTheme()).toBe('v4')
  })
})
