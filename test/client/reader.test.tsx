// @vitest-environment jsdom
import { createTheme, ThemeProvider } from '@mui/material/styles'
import React from 'react'
import { render, unmountComponentAtNode } from 'react-dom'
import { act } from 'react-dom/test-utils'
import { cache, mutate, SWRConfig } from 'swr'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const loadImg = vi.fn(async (url: string) => ({ error: false, url: url + '#img', retryURL: 'k' }))
vi.mock('@/apis', () => ({
  loadImg: (url: string) => loadImg(url),
  axios: { get: vi.fn() },
}))

import useComicData, { setComicCurrent } from '@/hooks/useComicData'
import { EVENT_LOAD_MORE_PAGE } from '@/constant'
import { store as eventStore } from '@/hooks/useEventListenerEnhance'
import ComicItem from '@/widgets/comic/ComicItem'

const theme = createTheme()
let container: HTMLDivElement
const wrap = (node: React.ReactNode) => (
  <SWRConfig value={{ dedupingInterval: 0, provider: undefined } as any}>
    <ThemeProvider theme={theme}>{node}</ThemeProvider>
  </SWRConfig>
)
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)) })

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  cache.clear()
  loadImg.mockClear()
})
afterEach(() => {
  unmountComponentAtNode(container)
  container.remove()
})

const slot = (index: number) => ({
  index,
  url: `https://e-hentai.org/s/000000000${index}/1000001-${index + 1}`,
  thumb: 'https://thumbs.example.hath.network/x.webp',
  sprite: { width: 200, height: 283, x: 200 * index, y: 0 },
  aspectratio: 200 / 283,
})

describe('ComicItem (vertical-mode full images)', () => {
  it('loads the full image once its slot is filled after mounting empty', async () => {
    const props = { index: 25, total: 60, perPage: 20, comicPagesKey: '/1/a/read' }
    await act(async () => { render(wrap(<ComicItem {...props} item={undefined} />), container) })
    await flush()
    expect(loadImg).not.toHaveBeenCalled()
    // the thumbnail page arrives and fills the slot
    await act(async () => { render(wrap(<ComicItem {...props} item={slot(5)} />), container) })
    await flush()
    expect(loadImg).toHaveBeenCalledTimes(1)
    expect(loadImg).toHaveBeenCalledWith(slot(5).url)
    expect(container.querySelector('img')?.getAttribute('src')).toContain(encodeURIComponent(slot(5).url + '#img'))
  })

  it('asks for the thumbnail page of its index using the real page size', async () => {
    const seen: number[] = []
    const unsub = (() => {
      const fn = (p: number) => seen.push(p)
      const list = eventStore.get(EVENT_LOAD_MORE_PAGE) || []
      eventStore.set(EVENT_LOAD_MORE_PAGE, [...list, fn])
      return () => eventStore.set(EVENT_LOAD_MORE_PAGE, (eventStore.get(EVENT_LOAD_MORE_PAGE) || []).filter((f) => f !== fn))
    })()
    await act(async () => {
      render(wrap(<ComicItem index={38} total={200} perPage={40} comicPagesKey="/1/a/read" item={undefined} />), container)
    })
    unsub()
    expect(seen).toEqual([0, 1]) // image 38 is on page 0, prefetch page 1 (with 20/page it would be page 1/2)
  })
})

describe('shared reader index survives a mode switch', () => {
  function Reader({ onData }: { onData: (current: number) => void }) {
    const { data } = useComicData('/1/a')
    onData(data!.current)
    return null
  }

  it('a list mounted after the switch starts from the index reached in the previous mode', async () => {
    const key = '/1/a/read'
    await act(async () => { mutate(key, { current: 5, list: [], total: 100, ready: true }, false) })
    const first: number[] = []
    await act(async () => { render(wrap(<Reader onData={(c) => first.push(c)} />), container) })
    // reading in the first mode
    await act(async () => { setComicCurrent(key, 27) })
    expect(first[first.length - 1]).toBe(27)
    // mode switch = unmount the old list, mount the other one
    unmountComponentAtNode(container)
    const second: number[] = []
    await act(async () => { render(wrap(<Reader onData={(c) => second.push(c)} />), container) })
    expect(second[0]).toBe(27)
  })
})
