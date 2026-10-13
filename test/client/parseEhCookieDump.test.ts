import { describe, expect, it } from 'vitest'
import {
  hasRequiredEhCookies,
  parseEhCookieDump,
} from '@/utils/parseEhCookieDump'

describe('parseEhCookieDump', () => {
  it('parses semicolon Cookie header style', () => {
    const r = parseEhCookieDump(
      'ipb_member_id=12345; ipb_pass_hash=abcdef0123456789; igneous=ZzYyXx; sk=other'
    )
    expect(r).toEqual({
      ipb_member_id: '12345',
      ipb_pass_hash: 'abcdef0123456789',
      igneous: 'ZzYyXx',
    })
  })

  it('parses colon style like JHenTai clipboard', () => {
    const r = parseEhCookieDump(
      'ipb_member_id: 99\nipb_pass_hash: deadbeef\nigneous: abc'
    )
    expect(r.ipb_member_id).toBe('99')
    expect(r.ipb_pass_hash).toBe('deadbeef')
    expect(r.igneous).toBe('abc')
  })

  it('omits mystery/deleted igneous', () => {
    const r = parseEhCookieDump(
      'ipb_member_id=1; ipb_pass_hash=abc; igneous=mystery'
    )
    expect(r.igneous).toBeUndefined()
    expect(hasRequiredEhCookies(r)).toBe(true)
  })

  it('returns empty for blank / incomplete', () => {
    expect(parseEhCookieDump('')).toEqual({})
    expect(hasRequiredEhCookies(parseEhCookieDump('ipb_member_id=1'))).toBe(
      false
    )
  })
})
