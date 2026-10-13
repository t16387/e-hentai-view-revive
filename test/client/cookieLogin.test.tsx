// @vitest-environment jsdom
import { createTheme, ThemeProvider } from '@mui/material/styles'
import React from 'react'
import { render, unmountComponentAtNode } from 'react-dom'
import { act } from 'react-dom/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/router', () => ({
  useRouter: () => ({ push: vi.fn(), query: {}, asPath: '/signin' }),
  default: { push: vi.fn() },
}))

import CookieLogin, {
  LEGACY_COOKIE_STORAGE_KEY,
} from '@/widgets/signin/CookieLogin'

let container: HTMLDivElement
beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  localStorage.clear()
})
afterEach(() => {
  unmountComponentAtNode(container)
  container.remove()
})

describe('CookieLogin', () => {
  it('clears the legacy localStorage cookie key on mount', async () => {
    localStorage.setItem(
      LEGACY_COOKIE_STORAGE_KEY,
      JSON.stringify({ ipb_member_id: '1', ipb_pass_hash: 'x' })
    )
    const onSubmit = vi.fn()
    await act(async () => {
      render(
        <ThemeProvider theme={createTheme()}>
          <CookieLogin onSubmit={onSubmit} />
        </ThemeProvider>,
        container
      )
    })
    expect(localStorage.getItem(LEGACY_COOKIE_STORAGE_KEY)).toBeNull()
  })

  it('does not submit when required fields are empty (Enter / submit)', async () => {
    const onSubmit = vi.fn()
    await act(async () => {
      render(
        <ThemeProvider theme={createTheme()}>
          <CookieLogin onSubmit={onSubmit} />
        </ThemeProvider>,
        container
      )
    })
    const form = container.querySelector('form')!
    await act(async () => {
      form.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true })
      )
    })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('does not persist secrets to localStorage on submit', async () => {
    const onSubmit = vi.fn()
    await act(async () => {
      render(
        <ThemeProvider theme={createTheme()}>
          <CookieLogin onSubmit={onSubmit} />
        </ThemeProvider>,
        container
      )
    })
    const id = container.querySelector('#ipb_member_id') as HTMLInputElement
    const hash = container.querySelector('#ipb_pass_hash') as HTMLInputElement
    await act(async () => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )!.set!
      nativeInputValueSetter.call(id, '123')
      id.dispatchEvent(new Event('input', { bubbles: true }))
      nativeInputValueSetter.call(hash, 'abcdef')
      hash.dispatchEvent(new Event('input', { bubbles: true }))
    })
    const form = container.querySelector('form')!
    await act(async () => {
      form.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true })
      )
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(localStorage.getItem(LEGACY_COOKIE_STORAGE_KEY)).toBeNull()
  })

  it('does not link to email/password login', async () => {
    const onSubmit = vi.fn()
    await act(async () => {
      render(
        <ThemeProvider theme={createTheme()}>
          <CookieLogin onSubmit={onSubmit} />
        </ThemeProvider>,
        container
      )
    })
    expect(container.querySelector('a[href="/signin"]')).toBeNull()
    expect(container.querySelector('#ipb_member_id')).toBeTruthy()
  })

  it('shows cookie dump field and forums open button', async () => {
    const onSubmit = vi.fn()
    await act(async () => {
      render(
        <ThemeProvider theme={createTheme()}>
          <CookieLogin onSubmit={onSubmit} />
        </ThemeProvider>,
        container
      )
    })
    expect(container.querySelector('#cookie_dump')).toBeTruthy()
    expect(container.querySelector('#open-forums-login')).toBeTruthy()
  })

  it('fills fields from a pasted cookie dump', async () => {
    const onSubmit = vi.fn()
    await act(async () => {
      render(
        <ThemeProvider theme={createTheme()}>
          <CookieLogin onSubmit={onSubmit} />
        </ThemeProvider>,
        container
      )
    })
    const dump = container.querySelector('#cookie_dump') as HTMLTextAreaElement
    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value'
    )!.set!
    await act(async () => {
      nativeSetter.call(
        dump,
        'ipb_member_id=42; ipb_pass_hash=hashhash; igneous=igval'
      )
      dump.dispatchEvent(new Event('change', { bubbles: true }))
    })
    const id = container.querySelector('#ipb_member_id') as HTMLInputElement
    const hash = container.querySelector('#ipb_pass_hash') as HTMLInputElement
    const ig = container.querySelector('#igneous') as HTMLInputElement
    expect(id.value).toBe('42')
    expect(hash.value).toBe('hashhash')
    expect(ig.value).toBe('igval')
  })
})
