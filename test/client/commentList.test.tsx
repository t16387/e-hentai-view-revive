// @vitest-environment jsdom
import { createTheme, ThemeProvider } from '@mui/material/styles'
import CommentList from '@/widgets/detail/CommentList'
import React from 'react'
import { render, unmountComponentAtNode } from 'react-dom'
import { act } from 'react-dom/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { push } = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('next/router', () => ({
  useRouter: () => ({
    push,
    replace: vi.fn(),
    back: vi.fn(),
    query: { gid: '111', token: 'aaaaaaaaaa', showPage: 'comments' },
    asPath: '/111/aaaaaaaaaa?showPage=comments',
  }),
}))
vi.mock('next-i18next', () => ({
  useTranslation: () => [(k: string) => k, { language: 'en' }],
}))
vi.mock('@/theme', () => ({
  useIsmobile: () => true,
}))

const comments = [
  {
    time: Date.UTC(2026, 9, 12, 6, 7),
    userName: 'B_Meow',
    score: '',
    comment:
      '图源：<a href="https://e-hentai.org/g/1330389/bbc8866a0f/">https://e-hentai.org/g/1330389/bbc8866a0f/</a>',
  },
  {
    time: Date.UTC(2026, 9, 12, 6, 8),
    userName: 'B_Meow',
    score: '',
    comment:
      '1：<a href="https://exhentai.org/g/1171668/86c2a6757b/">link</a>',
  },
]

let container: HTMLDivElement
beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  push.mockClear()
})
afterEach(() => {
  unmountComponentAtNode(container)
  container.remove()
})

describe('CommentList gallery link interception', () => {
  it('navigates in-app for e-hentai and exhentai gallery URLs', () => {
    const theme = createTheme()
    act(() => {
      render(
        <ThemeProvider theme={theme}>
          <CommentList commentList={comments as any} />
        </ThemeProvider>,
        container
      )
    })
    const links = container.querySelectorAll(
      '.commnets-list a[href*="hentai.org/g/"]'
    )
    expect(links.length).toBeGreaterThanOrEqual(1)

    act(() => {
      links[0].dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true })
      )
    })
    expect(push).toHaveBeenCalled()
    const [href, as] = push.mock.calls[0]
    expect(as).toBe('/1330389/bbc8866a0f')
    expect(href).toMatchObject({
      pathname: '/[gid]/[token]',
      query: { gid: '1330389', token: 'bbc8866a0f' },
    })
  })
})
