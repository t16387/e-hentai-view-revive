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
import { disposeImageLoader, getImageLoader, useReaderImageQueue } from '@/hooks/useReaderImages'

const KEY = '/1/a/read'
let failLoads = false
const resolveImg = vi.fn(async (page: string) => ({ url: 'https://h.example.hath.network/' + page.split('/s/')[1].split('?')[0] + '.webp', retryKey: 'key' }))
const loadImage = vi.fn(async () => {
  if (failLoads) throw new Error('image error')
  return 'decoded'
})

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
  resolveImg.mockClear()
  loadImage.mockClear()
  failLoads = false
  disposeImageLoader(KEY)
  getImageLoader(KEY, { resolve: (p) => resolveImg(p), load: () => loadImage() })
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
  // the queue (not the item) loads images now; the regression to guard is
  // the same: an item mounted before its slot is known must still load
  function List({ total, list, current = 0 }: { total: number; list: any[]; current?: number }) {
    const data = { total, list, current, perPage: 20, ready: true }
    useReaderImageQueue(KEY, data as any, { direct: true })
    return (
      <>
        {list.map((item, k) => (k >= current && k < current + 2 ? <ComicItem key={k} index={k} item={item} total={total} perPage={20} comicPagesKey={KEY} /> : null))}
      </>
    )
  }

  it('loads the full image once its slot is filled after mounting empty', async () => {
    const empty = new Array(60).fill(undefined)
    await act(async () => { render(wrap(<List total={60} list={empty} current={25} />), container) })
    await flush()
    expect(resolveImg).not.toHaveBeenCalled()
    // the thumbnail page arrives and fills the slots
    const filled = empty.map((_, k) => (k >= 20 && k < 40 ? slot(k) : undefined))
    await act(async () => { render(wrap(<List total={60} list={filled} current={25} />), container) })
    await flush()
    expect(resolveImg.mock.calls[0][0]).toBe(slot(25).url)
    const img = container.querySelector('img[alt="25"]')
    expect(img?.getAttribute('src')).toBe('https://h.example.hath.network/' + slot(25).url.split('/s/')[1] + '.webp')
    expect(img?.getAttribute('referrerpolicy')).toBe('no-referrer')
  })

  it('shows "Tap to reload" after the retries and reloads with the nl key', async () => {
    failLoads = true
    vi.useFakeTimers()
    try {
      const list = Array.from({ length: 3 }, (_, k) => slot(k))
      await act(async () => { render(wrap(<List total={3} list={list} />), container) })
      for (let k = 0; k < 10; k++) await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
      const button = container.querySelector('[data-index="0"] [data-reload-button]') as HTMLButtonElement
      expect(button).not.toBeNull()
      const calls = resolveImg.mock.calls.filter((c) => c[0].startsWith(slot(0).url)).length
      expect(calls).toBe(4) // first try + 3 nl retries
      failLoads = false
      await act(async () => { button.click(); await vi.advanceTimersByTimeAsync(10) })
      const last = resolveImg.mock.calls.filter((c) => c[0].startsWith(slot(0).url)).pop()![0]
      expect(last).toMatch(/\?nl=key$/)
      expect(container.querySelector('[data-index="0"] [data-reload-button]')).toBeNull()
      expect(container.querySelector('img[alt="0"]')).not.toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('a mode switch shows an already loaded image on the first render', async () => {
    const list = Array.from({ length: 3 }, (_, k) => slot(k))
    await act(async () => { render(wrap(<List total={3} list={list} />), container) })
    await flush()
    expect(container.querySelector('img[alt="0"]')).not.toBeNull()
    unmountComponentAtNode(container) // old mode's list goes away
    // no act(): inspect the very first commit of the new list, before any
    // effect or async work could load something
    render(wrap(<List total={3} list={list} />), container)
    expect(container.querySelector('img[alt="0"]')).not.toBeNull()
    await flush()
    expect(resolveImg.mock.calls.filter((c) => c[0] === slot(0).url)).toHaveLength(1) // no second lookup
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
