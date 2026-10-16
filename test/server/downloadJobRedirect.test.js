/**
 * downloadJob.fetchImageBuffer must mirror /api/gallery/proxy hop checks:
 * maxRedirects:0 + allowlist + assertPublicImageHost each hop.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { require } from './helpers'
import dns from 'node:dns'

const axios = require('../../server/src/axios')
const { fetchImageBuffer } = require('../../server/src/downloads/downloadJob')

describe('fetchImageBuffer redirect hops', () => {
  beforeEach(() => {
    vi.spyOn(dns.promises, 'lookup').mockResolvedValue([
      { address: '203.0.113.10', family: 4 },
    ])
  })
  afterEach(() => vi.restoreAllMocks())

  it('refuses a redirect to metadata / private host (SSRF)', async () => {
    const get = vi.spyOn(axios, 'get').mockResolvedValueOnce({
      status: 302,
      data: Buffer.from(''),
      headers: { location: 'http://169.254.169.254/latest/meta-data/' },
    })
    await expect(
      fetchImageBuffer('https://abcd.efgh.hath.network/h/x/1.jpg', '')
    ).rejects.toMatchObject({ code: 'EREDIRECT' })
    expect(get).toHaveBeenCalledTimes(1)
    expect(get.mock.calls[0][1].maxRedirects).toBe(0)
  })

  it('follows an allowlisted redirect and re-checks DNS per hop', async () => {
    const get = vi
      .spyOn(axios, 'get')
      .mockResolvedValueOnce({
        status: 302,
        data: Buffer.from(''),
        headers: {
          location: 'https://abcd.efgh.hath.network:4433/h/k/1.jpg',
        },
      })
      .mockResolvedValueOnce({
        status: 200,
        data: Buffer.from([0xff, 0xd8, 0xff]),
        headers: { 'content-type': 'image/jpeg' },
      })
    const { buf, ext } = await fetchImageBuffer(
      'https://exhentai.org/fullimg/1/1/x/1.jpg',
      'ipb_member_id=1; igneous=x; nw=1'
    )
    expect(get).toHaveBeenCalledTimes(2)
    expect(get.mock.calls[0][1].headers.Cookie).toMatch(/igneous=x/)
    expect(get.mock.calls[1][0]).toBe(
      'https://abcd.efgh.hath.network:4433/h/k/1.jpg'
    )
    expect(get.mock.calls[1][1].headers).toEqual({})
    expect(ext).toBe('jpg')
    expect(buf.length).toBe(3)
  })

  it('stops after two redirect hops', async () => {
    const hop = (location) => ({
      status: 301,
      data: Buffer.from(''),
      headers: { location },
    })
    const get = vi
      .spyOn(axios, 'get')
      .mockResolvedValue(hop('https://ehgt.org/loop.jpg'))
    await expect(
      fetchImageBuffer('https://ehgt.org/a.jpg', '')
    ).rejects.toMatchObject({ code: 'EREDIRECT' })
    expect(get).toHaveBeenCalledTimes(3)
  })

  it('refuses spoofed redirect hosts', async () => {
    const get = vi.spyOn(axios, 'get').mockResolvedValueOnce({
      status: 302,
      data: Buffer.from(''),
      headers: { location: 'https://evil.test;.exhentai.org/x' },
    })
    await expect(
      fetchImageBuffer('https://ehgt.org/a.jpg', '')
    ).rejects.toMatchObject({ code: 'EREDIRECT' })
    expect(get).toHaveBeenCalledTimes(1)
  })
})
