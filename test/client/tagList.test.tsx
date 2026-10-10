// @vitest-environment jsdom
import { createTheme, ThemeProvider } from '@mui/material/styles'
import TagList from '@/widgets/detail/TagList'
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
}))
vi.mock('next-i18next', () => ({
  useTranslation: () => [
    (k: string, opts?: { count?: number }) =>
      opts?.count != null ? `${k}:${opts.count}` : k,
    { language: 'en' },
  ],
}))

const tagList = [
  {
    namespace: 'artist',
    namespace_CHS: '艺术家',
    description: '',
    tags: [
      { name: 'alice', name_CHS: 'alice', intro: '', dash: false },
      { name: 'bob', name_CHS: 'bob', intro: '', dash: false },
    ],
  },
  {
    namespace: 'female',
    namespace_CHS: '女性',
    description: '',
    tags: [{ name: 'long hair', name_CHS: '长发', intro: '', dash: false }],
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

function mount() {
  const theme = createTheme()
  act(() => {
    render(
      <ThemeProvider theme={theme}>
        <TagList tagList={tagList as any} />
      </ThemeProvider>,
      container
    )
  })
}

describe('TagList multi-select', () => {
  it('does not navigate on single tag click', () => {
    mount()
    const chip = Array.from(container.querySelectorAll('[role="button"]')).find(
      (el) => el.textContent?.includes('alice')
    ) as HTMLElement
    expect(chip).toBeTruthy()
    act(() => {
      chip.click()
    })
    expect(push).not.toHaveBeenCalled()
    expect(chip.getAttribute('aria-pressed')).toBe('true')
  })

  it('searches all selected tags on confirm', () => {
    mount()
    const buttons = Array.from(
      container.querySelectorAll('[role="button"]')
    ) as HTMLElement[]
    const alice = buttons.find((el) => el.textContent?.includes('alice'))!
    const longHair = buttons.find((el) =>
      el.textContent?.includes('long hair')
    )!
    act(() => {
      alice.click()
      longHair.click()
    })
    const confirm = Array.from(container.querySelectorAll('button')).find(
      (el) => el.textContent?.includes('Tag.SearchSelected')
    ) as HTMLElement
    expect(confirm).toBeTruthy()
    act(() => {
      confirm.click()
    })
    expect(push).toHaveBeenCalledTimes(1)
    const href = push.mock.calls[0][0] as string
    expect(href).toContain('f_search=')
    expect(decodeURIComponent(href)).toContain('artist:"alice$"')
    expect(decodeURIComponent(href)).toContain('female:"long hair$"')
  })

  it('deselects and clears the confirm bar', () => {
    mount()
    const alice = Array.from(
      container.querySelectorAll('[role="button"]')
    ).find((el) => el.textContent?.includes('alice')) as HTMLElement
    act(() => {
      alice.click()
    })
    expect(alice.getAttribute('aria-pressed')).toBe('true')
    act(() => {
      alice.click()
    })
    expect(alice.getAttribute('aria-pressed')).toBe('false')
    const confirm = Array.from(container.querySelectorAll('button')).find(
      (el) => el.textContent?.includes('Tag.SearchSelected')
    )
    expect(confirm).toBeFalsy()
  })
})
