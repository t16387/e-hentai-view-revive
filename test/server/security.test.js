import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import http from 'node:http'
import { format } from 'node:util'
import { require } from './helpers'
import dns from 'node:dns'
const express = require('express')
const { sanitizeCommentHtml } = require('../../server/src/utils/sanitizeHtml')
const { isPrivateIp } = require('../../server/src/utils/privateIp')
const axios = require('../../server/src/axios')

describe('isPrivateIp', () => {
  it.each([
    '127.0.0.1',
    '10.0.0.1',
    '192.168.1.1',
    '172.16.0.1',
    '169.254.169.254',
    '0.0.0.0',
    '::1',
    'fe80::1',
    'fc00::1',
    'fd12:3456::1',
  ])('flags %s as private', (ip) => expect(isPrivateIp(ip)).toBe(true))

  it.each(['1.1.1.1', '8.8.8.8', '203.0.113.10'])(
    'allows public %s',
    (ip) => expect(isPrivateIp(ip)).toBe(false)
  )
})

describe('sanitizeCommentHtml', () => {
  it('strips script and event handlers, keeps safe anchors', () => {
    const out = sanitizeCommentHtml(
      'hi <script>alert(1)</script><a href="https://e-hentai.org/g/1/aaaaaaaaaa/" onclick="evil()">g</a><img src=x onerror=alert(1)>'
    )
    expect(out).not.toMatch(/script|onclick|onerror|img/i)
    expect(out).toContain('href="https://e-hentai.org/g/1/aaaaaaaaaa/"')
    expect(out).toContain('>g</a>')
  })
  it('drops javascript: hrefs', () => {
    const out = sanitizeCommentHtml(
      '<a href="javascript:alert(1)">x</a>'
    )
    expect(out).not.toMatch(/javascript:/i)
  })
})

let server
let base
const logs = []
beforeAll(async () => {
  vi.spyOn(express.application, 'listen').mockImplementation(() => null)
  const app = require('../../server/src/app')
  server = http.createServer(app)
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  base = `http://127.0.0.1:${server.address().port}`
})
afterAll(() => new Promise((r) => server.close(r)))
afterEach(() => {
  logs.length = 0
  vi.restoreAllMocks()
})

function captureLogs() {
  for (const m of ['log', 'error', 'warn'])
    vi.spyOn(console, m).mockImplementation((...a) => logs.push(format(...a)))
}

async function req(method, path, { cookie, headers = {}, body } = {}) {
  captureLogs()
  const init = {
    method,
    headers: {
      ...(cookie ? { cookie } : {}),
      ...headers,
    },
  }
  if (body !== undefined) {
    init.headers['content-type'] = 'application/json'
    init.body = JSON.stringify(body)
  }
  const res = await fetch(base + path, init)
  const text = await res.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch (e) {}
  for (const m of ['log', 'error', 'warn']) vi.mocked(console[m]).mockRestore()
  return { status: res.status, json, text }
}

describe('app security middleware', () => {
  it('logs the path only (no query string)', async () => {
    await req('GET', '/api/gallery?f_search=secretquery&url=key', {
      cookie: '',
    })
    const line = logs.find((l) => l.includes('GET ->'))
    expect(line).toBeTruthy()
    expect(line).toBe('GET -> /api/gallery')
    expect(logs.join('\n')).not.toContain('secretquery')
  })

  it('No-login gate is case-insensitive (/API/...)', async () => {
    const r = await req('GET', '/API/gallery', { cookie: '' })
    expect(r.json).toMatchObject({ error: true, message: 'No login' })
  })

  it('login CSRF: rejects bare POST without Origin/Referer/header', async () => {
    const r = await req('POST', '/api/user/login', {
      body: { method: 'cookie', ipb_member_id: '1', ipb_pass_hash: 'x' },
    })
    expect(r.status).toBe(403)
    expect(r.json).toMatchObject({ error: true, message: 'csrf rejected' })
  })

  it('login CSRF: accepts the SPA X-EHV-CSRF header', async () => {
    vi.spyOn(axios, 'get').mockRejectedValue(
      Object.assign(new Error('upstream down'), { code: 'ECONNREFUSED' })
    )
    const r = await req('POST', '/api/user/login', {
      headers: { 'x-ehv-csrf': '1' },
      body: {
        method: 'cookie',
        ipb_member_id: '1',
        ipb_pass_hash: '0'.repeat(32),
        igneous: 'x',
      },
    })
    expect(r.status).not.toBe(403)
    expect(r.json && r.json.message).not.toBe('csrf rejected')
  })
})
