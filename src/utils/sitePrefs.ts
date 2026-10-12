import { LOCAL_EHV_SITE } from '@/constant'

/** Upstream gallery site the SPA asks the server to use. */
export type EhvSiteId = 'e-hentai' | 'exhentai'

export const EHV_SITE_IDS: readonly EhvSiteId[] = [
  'e-hentai',
  'exhentai',
] as const

/** App default when nothing is stored (matches Compose / .env.example). */
export const DEFAULT_EHV_SITE: EhvSiteId = 'e-hentai'

export function normalizeEhvSite(raw: string | null | undefined): EhvSiteId {
  if (raw === 'e-hentai' || raw === 'exhentai') return raw
  return DEFAULT_EHV_SITE
}

export function readEhvSite(): EhvSiteId {
  if (typeof window === 'undefined') return DEFAULT_EHV_SITE
  try {
    return normalizeEhvSite(window.localStorage.getItem(LOCAL_EHV_SITE))
  } catch {
    return DEFAULT_EHV_SITE
  }
}

export function writeEhvSite(id: EhvSiteId) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LOCAL_EHV_SITE, id)
  } catch {
    // quota / private mode — ignore
  }
}
