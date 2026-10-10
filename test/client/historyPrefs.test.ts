// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { LOCAL_DO_NOT_STORE_HISTORY } from '@/constant'
import {
  readDoNotStoreHistory,
  writeDoNotStoreHistory,
} from '@/utils/historyPrefs'

afterEach(() => {
  localStorage.removeItem(LOCAL_DO_NOT_STORE_HISTORY)
})

describe('historyPrefs', () => {
  it('defaults to false when unset', () => {
    expect(readDoNotStoreHistory()).toBe(false)
  })

  it('reads and writes the string flag', () => {
    writeDoNotStoreHistory(true)
    expect(localStorage.getItem(LOCAL_DO_NOT_STORE_HISTORY)).toBe('true')
    expect(readDoNotStoreHistory()).toBe(true)
    writeDoNotStoreHistory(false)
    expect(localStorage.getItem(LOCAL_DO_NOT_STORE_HISTORY)).toBe('false')
    expect(readDoNotStoreHistory()).toBe(false)
  })

  it('ignores other truthy-looking values', () => {
    localStorage.setItem(LOCAL_DO_NOT_STORE_HISTORY, '1')
    expect(readDoNotStoreHistory()).toBe(false)
    localStorage.setItem(LOCAL_DO_NOT_STORE_HISTORY, 'yes')
    expect(readDoNotStoreHistory()).toBe(false)
  })
})
