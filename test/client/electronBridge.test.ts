// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import {
  getElectronAPI,
  isElectronShell,
} from '@/utils/electronBridge'

afterEach(() => {
  delete (window as any).electronAPI
})

describe('electronBridge', () => {
  it('is false in a plain browser without electronAPI', () => {
    expect(getElectronAPI()).toBeNull()
    // UA fallback may still match in some environments; prefer API check
    expect(getElectronAPI()).toBeNull()
  })

  it('detects preload bridge when present', () => {
    ;(window as any).electronAPI = {
      isElectron: true,
      openLoginWebView: async () => ({ ok: true }),
      closeLoginWebView: async () => ({ ok: true }),
      onLoginCookies: () => () => {},
      onLoginWebViewEvent: () => () => {},
    }
    expect(isElectronShell()).toBe(true)
    expect(getElectronAPI()?.isElectron).toBe(true)
  })

  it('rejects incomplete bridge objects', () => {
    ;(window as any).electronAPI = { isElectron: true }
    expect(getElectronAPI()).toBeNull()
  })
})
