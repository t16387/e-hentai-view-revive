import { afterEach, describe, expect, it, vi } from 'vitest'
import { require } from './helpers'

const { resolveListenPort } = require('../../server/src/config/listenPort')

describe('resolveListenPort', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('defaults to 8080 for API/container style', () => {
    expect(resolveListenPort({}, { defaultPort: 8080 })).toBe(8080)
  })

  it('defaults to 3000 for local Next/browser style', () => {
    expect(resolveListenPort({}, { defaultPort: 3000 })).toBe(3000)
  })

  it('prefers PORT over EHV_HOST_PORT', () => {
    expect(
      resolveListenPort(
        { PORT: '3001', EHV_HOST_PORT: '3002' },
        { defaultPort: 3000 }
      )
    ).toBe(3001)
  })

  it('uses EHV_HOST_PORT as alias when PORT unset', () => {
    expect(
      resolveListenPort({ EHV_HOST_PORT: '3001' }, { defaultPort: 3000 })
    ).toBe(3001)
  })

  it('ignores empty or invalid values', () => {
    expect(resolveListenPort({ PORT: '' }, { defaultPort: 8080 })).toBe(8080)
    expect(resolveListenPort({ PORT: 'nope' }, { defaultPort: 8080 })).toBe(8080)
    expect(resolveListenPort({ PORT: '0' }, { defaultPort: 8080 })).toBe(8080)
  })

  it('trims whitespace from env values', () => {
    expect(resolveListenPort({ PORT: ' 3001 ' }, { defaultPort: 3000 })).toBe(
      3001
    )
  })
})
