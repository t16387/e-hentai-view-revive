import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
const require = createRequire(import.meta.url)

describe('server modules', () => {
  it('cookie helper serialises an object', () => {
    const { getCookieString } = require('../../server/src/utils/cookies')
    expect(getCookieString({ a: '1', b: '2' })).toContain('a=1')
  })
})
