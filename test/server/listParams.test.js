import { describe, expect, it } from 'vitest'
import { require } from './helpers'
const { pickListParams, listCacheKey } = require('../../server/src/gallery/listParams')

describe('pickListParams', () => {
  it('drops page= (ignored by the site) and unknown keys', () => {
    expect(pickListParams({ page: '3', f_search: 'abc', inline_set: 'dm_l', evil: '1' })).toEqual({ f_search: 'abc' })
  })

  it('keeps cursors, including favorites gid-favtime cursors', () => {
    expect(pickListParams({ next: '1000001' })).toEqual({ next: '1000001' })
    expect(pickListParams({ prev: '1000001-1700000000' })).toEqual({ prev: '1000001-1700000000' })
  })

  it('next wins over prev', () => {
    expect(pickListParams({ next: '5', prev: '9' })).toEqual({ next: '5' })
  })

  it('rejects malformed values', () => {
    expect(
      pickListParams({ next: '1;rm', f_cats: '5000', f_srdd: '9', seek: 'yesterday', f_sh: 'yes', jump: '3x' })
    ).toEqual({})
  })

  it('keeps advanced search params', () => {
    expect(
      pickListParams({ f_search: ' q ', f_cats: '767', advsearch: '1', f_sh: 'on', f_sr: 'on', f_srdd: '4', f_sp: 'on', f_spf: '10', f_spt: '200', seek: '2026-01-31', jump: '1w' })
    ).toEqual({ advsearch: '1', f_cats: '767', f_search: 'q', f_sh: 'on', f_sp: 'on', f_spf: '10', f_spt: '200', f_sr: 'on', f_srdd: '4', jump: '1w', seek: '2026-01-31' })
  })

  it('ignores arrays and empty strings', () => {
    expect(pickListParams({ f_search: ['a', 'b'], next: '' })).toEqual({})
  })

  it('extra rules (favorites favcat)', () => {
    const extra = { favcat: (v) => v === 'all' || /^\d$/.test(v) }
    expect(pickListParams({ favcat: '3', next: '1-2' }, extra)).toEqual({ favcat: '3', next: '1-2' })
    expect(pickListParams({ favcat: '../x' }, extra)).toEqual({})
  })

  it('cache key is stable regardless of query order', () => {
    const a = listCacheKey('gallery', '1', pickListParams({ next: '5', f_search: 'x' }))
    const b = listCacheKey('gallery', '1', pickListParams({ f_search: 'x', next: '5' }))
    expect(a).toBe(b)
    expect(a).not.toBe(listCacheKey('gallery', '2', pickListParams({ f_search: 'x', next: '5' })))
  })
})
