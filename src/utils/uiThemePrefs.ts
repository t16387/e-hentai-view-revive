import { LOCAL_UI_THEME } from '@/constant'

/** Selectable UI chrome themes (layout + tokens). Independent of light/dark. */
export type UiThemeId = 'classic' | 'v3' | 'v4'

export const UI_THEME_IDS: readonly UiThemeId[] = [
  'classic',
  'v3',
  'v4',
] as const

export const DEFAULT_UI_THEME: UiThemeId = 'v4'

export function normalizeUiTheme(raw: string | null | undefined): UiThemeId {
  if (raw === 'classic' || raw === 'v3' || raw === 'v4') return raw
  return DEFAULT_UI_THEME
}

export function readUiTheme(): UiThemeId {
  if (typeof window === 'undefined') return DEFAULT_UI_THEME
  try {
    return normalizeUiTheme(window.localStorage.getItem(LOCAL_UI_THEME))
  } catch {
    return DEFAULT_UI_THEME
  }
}

export function writeUiTheme(id: UiThemeId) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LOCAL_UI_THEME, id)
  } catch {
    // quota / private mode — ignore
  }
}
