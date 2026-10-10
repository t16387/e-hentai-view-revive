// @vitest-environment jsdom
import { createTheme, ThemeProvider } from '@mui/material/styles'
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
    query: {},
    asPath: '/1/a',
  }),
  default: { push, replace: vi.fn() },
}))

import Info from '@/widgets/detail/Info'
import { IsMobile } from '@/theme'
import { LOCAL_COMIC_READ_PAGE_HISTORY } from '@/constant'

const info: any = {
  gid: 123,
  token: 'abcdef1234',
  title: 'Example title',
  title_jpn: 'Example title (jp)',
  category: 'Misc',
  thumb: '',
  uploader: 'someone',
  posted: '0',
  filecount: '10',
  filesize: 1000,
  expunged: false,
  rating: '4.5',
  torrentcount: '0',
  url: 'https://e-hentai.org/g/123/abcdef1234/',
  tags: [],
}

class IO {
  observe() {}
  unobserve() {}
  disconnect() {}
}
;(globalThis as any).IntersectionObserver = IO

let container: HTMLDivElement
beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  push.mockClear()
  localStorage.clear()
})
afterEach(() => {
  unmountComponentAtNode(container)
  container.remove()
})

async function renderInfo(mobile: boolean) {
  await act(async () => {
    render(
      <ThemeProvider theme={createTheme()}>
        <IsMobile.Provider value={mobile}>
          <Info info={info} tagList={[]} />
        </IsMobile.Provider>
      </ThemeProvider>,
      container
    )
  })
  return container.querySelector('[data-read-button]') as HTMLButtonElement
}

describe('gallery detail Read button', () => {
  it.each([
    ['desktop', false],
    ['mobile', true],
  ])('is shown in the %s layout and opens the reader', async (_, mobile) => {
    const btn = await renderInfo(mobile)
    expect(btn).not.toBeNull()
    await act(async () => {
      btn.click()
    })
    expect(push).toHaveBeenCalledWith(
      '/[gid]/[token]/read',
      '/123/abcdef1234/read'
    )
  })

  it('resumes at the saved page on desktop', async () => {
    localStorage.setItem(
      LOCAL_COMIC_READ_PAGE_HISTORY,
      JSON.stringify({ '/123/abcdef1234/read': 12 })
    )
    const btn = await renderInfo(false)
    expect(btn.textContent).toContain('13p')
    await act(async () => {
      btn.click()
    })
    expect(push).toHaveBeenCalledWith(
      '/[gid]/[token]/read?current=12',
      '/123/abcdef1234/read?current=12'
    )
  })
})
