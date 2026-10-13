import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { require } from './helpers'

describe('downloadStore', () => {
  let dir
  let store

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'ehv-dl-'))
    process.env.EHV_DOWNLOADS_DIR = dir
    // fresh module with new env
    store = require('../../server/src/downloads/downloadStore')
  })

  afterEach(() => {
    delete process.env.EHV_DOWNLOADS_DIR
    try {
      rmSync(dir, { recursive: true, force: true })
    } catch (e) {}
  })

  it('parses valid ids and rejects bad ones', () => {
    expect(store.parseDownloadId('123_abcdef')).toEqual({
      gid: '123',
      token: 'abcdef',
      id: '123_abcdef',
    })
    expect(store.parseDownloadId('../etc/passwd')).toBeNull()
    expect(store.parseDownloadId('abc_def')).toBeNull()
    expect(store.parseDownloadId('1_ZZ')).toBeNull()
  })

  it('writes and lists meta', async () => {
    const id = store.downloadId('42', 'deadbeef')
    await store.writeMeta(id, {
      id,
      gid: '42',
      token: 'deadbeef',
      status: 'complete',
      done: 2,
      total: 2,
      title: 'Test',
      title_jpn: 'Test JP',
      createdAt: 1,
      updatedAt: 2,
      hasZip: false,
      files: [{ ext: 'jpg', size: 10 }, { ext: 'jpg', size: 11 }],
    })
    const list = await store.listDownloads()
    expect(list).toHaveLength(1)
    expect(list[0].id).toBe(id)
    expect(list[0].status).toBe('complete')
    expect(list[0].title_jpn).toBe('Test JP')
  })

  it('clears all downloads', async () => {
    const id = store.downloadId('1', 'aaa')
    await store.writeMeta(id, {
      id,
      gid: '1',
      token: 'aaa',
      status: 'queued',
      done: 0,
      total: 0,
      createdAt: 1,
      updatedAt: 1,
    })
    const n = await store.clearAllDownloads()
    expect(n).toBe(1)
    expect(await store.listDownloads()).toEqual([])
  })
})
