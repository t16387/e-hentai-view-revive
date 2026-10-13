/**
 * Downloads + cache-clear API over the real express app with upstream mocked.
 */
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
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { require } from './helpers'

const express = require('express')

let server
let base
let dir

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'ehv-dl-api-'))
  process.env.EHV_DOWNLOADS_DIR = dir
  vi.spyOn(express.application, 'listen').mockImplementation(() => null)
  // clear require cache for app + download modules so they pick up env
  for (const key of Object.keys(require.cache || {})) {
    if (
      /server\/src\/(app|downloads|cacheRouter|cache)\b/.test(key.replace(/\\/g, '/'))
    ) {
      delete require.cache[key]
    }
  }
  const app = require('../../server/src/app')
  server = http.createServer(app)
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  base = `http://127.0.0.1:${server.address().port}`
})

afterAll(async () => {
  await new Promise((r) => server.close(r))
  delete process.env.EHV_DOWNLOADS_DIR
  try {
    rmSync(dir, { recursive: true, force: true })
  } catch (e) {}
})

afterEach(() => {
  vi.restoreAllMocks()
})

async function req(method, path, { body, headers = {} } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: {
      'X-EHV-CSRF': '1',
      'content-type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch (e) {}
  return { status: res.status, json, text }
}

describe('downloads + cache API', () => {
  it('lists empty downloads', async () => {
    const r = await req('GET', '/api/downloads')
    expect(r.json).toMatchObject({ error: false, list: [] })
  })

  it('rejects bad gid/token on POST', async () => {
    const r = await req('POST', '/api/downloads', {
      body: { gid: '../x', token: 'ab' },
    })
    expect(r.status).toBe(400)
    expect(r.json.error).toBe(true)
  })

  it('requires CSRF for POST /api/downloads', async () => {
    const res = await fetch(base + '/api/downloads', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ gid: '1', token: 'abcdef' }),
    })
    expect(res.status).toBe(403)
  })

  it('clears server cache', async () => {
    const cache = require('../../server/src/cache')
    cache.set('test-key', { hello: 1 }, 60)
    expect(cache.get('test-key')).toBeTruthy()
    const r = await req('POST', '/api/cache/clear')
    expect(r.json).toMatchObject({ error: false })
    expect(cache.get('test-key')).toBeUndefined()
  })

  it('clears all downloads including seeded meta', async () => {
    const store = require('../../server/src/downloads/downloadStore')
    const id = store.downloadId('99', 'abcdef')
    await store.writeMeta(id, {
      id,
      gid: '99',
      token: 'abcdef',
      status: 'complete',
      done: 1,
      total: 1,
      createdAt: 1,
      updatedAt: 1,
      hasZip: false,
      files: [{ ext: 'jpg', size: 1 }],
    })
    // also drop a tiny image file
    const imgDir = join(dir, id, 'images')
    mkdirSync(imgDir, { recursive: true })
    writeFileSync(join(imgDir, '0000.jpg'), Buffer.from([0xff, 0xd8, 0xff]))

    const listed = await req('GET', '/api/downloads')
    expect(listed.json.list.length).toBeGreaterThanOrEqual(1)

    const img = await req('GET', `/api/downloads/${id}/images/0`)
    expect(img.status).toBe(200)

    const cleared = await req('DELETE', '/api/downloads')
    expect(cleared.json).toMatchObject({ error: false })
    expect(cleared.json.removed).toBeGreaterThanOrEqual(1)

    const after = await req('GET', '/api/downloads')
    expect(after.json.list).toEqual([])
  })
})
