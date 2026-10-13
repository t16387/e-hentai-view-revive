const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const {
  pickEhCookies,
  hasRequiredEhCookies,
  mergeCookieLists,
} = require('../src/cookieHelpers')

describe('pickEhCookies', () => {
  it('extracts required fields from Electron-like cookie list', () => {
    const fields = pickEhCookies([
      { name: 'ipb_member_id', value: '12345', domain: '.e-hentai.org' },
      { name: 'ipb_pass_hash', value: 'abcdef', domain: '.e-hentai.org' },
      { name: 'other', value: 'nope', domain: '.e-hentai.org' },
    ])
    assert.equal(fields.ipb_member_id, '12345')
    assert.equal(fields.ipb_pass_hash, 'abcdef')
    assert.equal(fields.igneous, undefined)
  })

  it('skips mystery / deleted / empty igneous', () => {
    const fields = pickEhCookies([
      { name: 'ipb_member_id', value: '1' },
      { name: 'ipb_pass_hash', value: 'h' },
      { name: 'igneous', value: 'mystery' },
    ])
    assert.equal(fields.igneous, undefined)
    assert.ok(hasRequiredEhCookies(fields))
  })

  it('keeps a real igneous value', () => {
    const fields = pickEhCookies([
      { name: 'ipb_member_id', value: '1' },
      { name: 'ipb_pass_hash', value: 'h' },
      { name: 'igneous', value: 'realigneous' },
    ])
    assert.equal(fields.igneous, 'realigneous')
  })

  it('last write wins for duplicate names', () => {
    const fields = pickEhCookies([
      { name: 'ipb_member_id', value: 'old' },
      { name: 'ipb_member_id', value: 'new' },
      { name: 'ipb_pass_hash', value: 'h' },
    ])
    assert.equal(fields.ipb_member_id, 'new')
  })
})

describe('hasRequiredEhCookies', () => {
  it('requires both id and hash', () => {
    assert.equal(hasRequiredEhCookies({}), false)
    assert.equal(hasRequiredEhCookies({ ipb_member_id: '1' }), false)
    assert.equal(hasRequiredEhCookies({ ipb_pass_hash: 'h' }), false)
    assert.equal(
      hasRequiredEhCookies({ ipb_member_id: '1', ipb_pass_hash: 'h' }),
      true
    )
  })
})

describe('mergeCookieLists', () => {
  it('merges domain query results', () => {
    const fields = mergeCookieLists(
      [{ name: 'ipb_member_id', value: '9' }],
      [{ name: 'ipb_pass_hash', value: 'z' }],
      [{ name: 'igneous', value: 'ig' }]
    )
    assert.deepEqual(fields, {
      ipb_member_id: '9',
      ipb_pass_hash: 'z',
      igneous: 'ig',
    })
  })
})
