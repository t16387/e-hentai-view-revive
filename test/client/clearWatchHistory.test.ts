// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import {
  LOCAL_COMIC_READ_PAGE_HISTORY,
  LOCAL_HISTORY,
  LOCAL_SEARCH_HISTORY,
} from '@/constant'
import { clearWatchHistory } from '@/utils/clearWatchHistory'

afterEach(() => {
  localStorage.removeItem(LOCAL_HISTORY)
  localStorage.removeItem(LOCAL_COMIC_READ_PAGE_HISTORY)
  localStorage.removeItem(LOCAL_SEARCH_HISTORY)
})

describe('clearWatchHistory', () => {
  it('removes browse history and read-page progress', () => {
    localStorage.setItem(LOCAL_HISTORY, JSON.stringify([{ gid: 1 }]))
    localStorage.setItem(
      LOCAL_COMIC_READ_PAGE_HISTORY,
      JSON.stringify({ '1': 3 })
    )
    localStorage.setItem(LOCAL_SEARCH_HISTORY, JSON.stringify(['foo']))

    clearWatchHistory()

    expect(localStorage.getItem(LOCAL_HISTORY)).toBeNull()
    expect(localStorage.getItem(LOCAL_COMIC_READ_PAGE_HISTORY)).toBeNull()
    expect(localStorage.getItem(LOCAL_SEARCH_HISTORY)).toBe(
      JSON.stringify(['foo'])
    )
  })

  it('is a no-op when keys are already absent', () => {
    expect(() => clearWatchHistory()).not.toThrow()
    expect(localStorage.getItem(LOCAL_HISTORY)).toBeNull()
    expect(localStorage.getItem(LOCAL_COMIC_READ_PAGE_HISTORY)).toBeNull()
  })
})
