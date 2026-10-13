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

import Login from '@/widgets/signin/Login'

let container: HTMLDivElement
beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
})
afterEach(() => {
  unmountComponentAtNode(container)
  container.remove()
})

describe('Password Login (in-app Sign In)', () => {
  it('renders username and password fields without external links', async () => {
    const onSubmit = vi.fn()
    await act(async () => {
      render(
        <ThemeProvider theme={createTheme()}>
          <Login onSubmit={onSubmit} />
        </ThemeProvider>,
        container
      )
    })
    expect(container.querySelector('#UserName')).toBeTruthy()
    expect(container.querySelector('#PassWord')).toBeTruthy()
    expect(container.querySelector('a[target="_blank"]')).toBeNull()
    expect(container.querySelector('#ipb_member_id')).toBeNull()
  })

  it('does not submit when fields are empty', async () => {
    const onSubmit = vi.fn()
    await act(async () => {
      render(
        <ThemeProvider theme={createTheme()}>
          <Login onSubmit={onSubmit} />
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

  it('submits trimmed username and password (never to localStorage)', async () => {
    const onSubmit = vi.fn()
    await act(async () => {
      render(
        <ThemeProvider theme={createTheme()}>
          <Login onSubmit={onSubmit} />
        </ThemeProvider>,
        container
      )
    })
    const user = container.querySelector('#UserName') as HTMLInputElement
    const pass = container.querySelector('#PassWord') as HTMLInputElement
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )!.set!
    await act(async () => {
      nativeInputValueSetter.call(user, '  alice  ')
      user.dispatchEvent(new Event('input', { bubbles: true }))
      nativeInputValueSetter.call(pass, 'secret')
      pass.dispatchEvent(new Event('input', { bubbles: true }))
    })
    const form = container.querySelector('form')!
    await act(async () => {
      form.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true })
      )
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(onSubmit).toHaveBeenCalledWith({
      UserName: 'alice',
      PassWord: 'secret',
    })
    expect(localStorage.length).toBe(0)
  })
})
