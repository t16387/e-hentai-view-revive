// @vitest-environment jsdom
import { createTheme, ThemeProvider } from '@mui/material/styles'
import React from 'react'
import { render, unmountComponentAtNode } from 'react-dom'
import { act } from 'react-dom/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next-i18next', () => ({
  useTranslation: () => [
    (k: string) => k,
    { language: 'en' },
  ],
}))

import WebViewLogin from '@/widgets/signin/WebViewLogin'

let container: HTMLDivElement
beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  delete (window as any).electronAPI
})
afterEach(() => {
  unmountComponentAtNode(container)
  container.remove()
  delete (window as any).electronAPI
})

describe('WebViewLogin', () => {
  it('renders nothing outside Electron', async () => {
    await act(async () => {
      render(
        <ThemeProvider theme={createTheme()}>
          <WebViewLogin onSubmit={vi.fn()} />
        </ThemeProvider>,
        container
      )
    })
    expect(container.querySelector('[data-testid="webview-login"]')).toBeNull()
  })

  it('shows Sign in with WebView when electronAPI is present', async () => {
    const openLoginWebView = vi.fn(async () => ({ ok: true }))
    ;(window as any).electronAPI = {
      isElectron: true,
      openLoginWebView,
      closeLoginWebView: vi.fn(async () => ({ ok: true })),
      onLoginCookies: () => () => {},
      onLoginWebViewEvent: () => () => {},
    }
    await act(async () => {
      render(
        <ThemeProvider theme={createTheme()}>
          <WebViewLogin onSubmit={vi.fn()} />
        </ThemeProvider>,
        container
      )
    })
    const btn = container.querySelector('#open-webview-login')
    expect(btn).toBeTruthy()
    await act(async () => {
      ;(btn as HTMLButtonElement).click()
    })
    expect(openLoginWebView).toHaveBeenCalled()
  })

  it('submits cookies when onLoginCookies fires', async () => {
    let cookieCb: ((c: any) => void) | null = null
    const onSubmit = vi.fn()
    ;(window as any).electronAPI = {
      isElectron: true,
      openLoginWebView: async () => ({ ok: true }),
      closeLoginWebView: async () => ({ ok: true }),
      onLoginCookies: (cb: any) => {
        cookieCb = cb
        return () => {}
      },
      onLoginWebViewEvent: () => () => {},
    }
    await act(async () => {
      render(
        <ThemeProvider theme={createTheme()}>
          <WebViewLogin onSubmit={onSubmit} />
        </ThemeProvider>,
        container
      )
    })
    await act(async () => {
      cookieCb!({
        ipb_member_id: '42',
        ipb_pass_hash: 'hash',
        igneous: 'ig',
      })
    })
    expect(onSubmit).toHaveBeenCalledWith({
      method: 'cookie',
      ipb_member_id: '42',
      ipb_pass_hash: 'hash',
      igneous: 'ig',
    })
  })
})
