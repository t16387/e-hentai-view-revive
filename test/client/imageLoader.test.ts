import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  attemptPlan,
  ImageLoader,
  isFatalError,
  prefetchOrder,
  retryDelay,
} from '@/widgets/comic/imageLoader'

type Deferred<T> = { promise: Promise<T>; resolve: (v: T) => void; reject: (e: unknown) => void; signal: AbortSignal; arg: string }

/** resolve/load mocks whose calls can be settled one by one */
function harness(opts: ConstructorParameters<typeof ImageLoader>[1] = {}, known = (i: number) => true) {
  const resolves: Deferred<{ url: string; retryKey: string }>[] = []
  const loads: Deferred<unknown>[] = []
  const make = <T,>(list: Deferred<T>[], arg: string, signal: AbortSignal) => {
    let d!: Deferred<T>
    const promise = new Promise<T>((resolve, reject) => {
      d = { promise: null as any, resolve, reject, signal, arg }
      signal.addEventListener('abort', () => reject(new Error('aborted')))
    })
    d.promise = promise
    list.push(d)
    return promise
  }
  const loader = new ImageLoader(
    {
      pageUrlOf: (i) => (known(i) ? `https://exhentai.org/s/aaaa/1000001-${i + 1}` : undefined),
      resolve: (page, signal) => make(resolves, page, signal),
      load: (src, { signal }) => make(loads, src, signal),
      toSrc: (url, via) => (via === 'direct' ? url : '/api/gallery/proxy?url=' + encodeURIComponent(url)),
      canLoadDirect: (url) => url.includes('.hath.network'),
    },
    opts
  )
  const flush = async () => { for (let k = 0; k < 5; k++) await Promise.resolve() }
  /** settle the newest pending resolve for page n */
  const answer = async (d: Deferred<{ url: string; retryKey: string }>, host = 'abc.hath.network', key = 'k1') => {
    const n = /-(\d+)(\?|$)/.exec(d.arg)![1]
    d.resolve({ url: `https://${host}/h/${n}.webp`, retryKey: key })
    await flush()
  }
  return { loader, resolves, loads, flush, answer }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('pure helpers', () => {
  it('prefetchOrder: current first, then ahead in reading direction, then behind', () => {
    expect(prefetchOrder(10, 100)).toEqual([10, 11, 12, 13, 14, 9])
    expect(prefetchOrder(0, 3)).toEqual([0, 1, 2])
    expect(prefetchOrder(99, 100, { ahead: 4, behind: 2 })).toEqual([99, 98, 97])
    expect(prefetchOrder(500, 100)).toEqual([99, 98])
    expect(prefetchOrder(5, 0)).toEqual([])
  })
  it('retryDelay: backoff 1s, 2s, 4s then give up', () => {
    const d = [1000, 2000, 4000]
    expect([1, 2, 3, 4].map((a) => retryDelay(a, d))).toEqual([1000, 2000, 4000, null])
  })
  it('attemptPlan: first try plain page, retries with nl; direct twice then proxy', () => {
    const o = { direct: true, preferProxy: false }
    expect([0, 1, 2, 3].map((a) => attemptPlan(a, o))).toEqual([
      { nl: false, via: 'direct' },
      { nl: true, via: 'direct' },
      { nl: true, via: 'proxy' },
      { nl: true, via: 'proxy' },
    ])
    expect(attemptPlan(0, { direct: false, preferProxy: false }).via).toBe('proxy')
    expect(attemptPlan(0, { direct: true, preferProxy: true }).via).toBe('proxy')
  })
  it('fatal errors are not retried', () => {
    expect(isFatalError('[509] image viewing limit exceeded')).toBe(true)
    expect(isFatalError('No login')).toBe(true)
    expect(isFatalError('image error')).toBe(false)
  })
})

describe('queue and concurrency', () => {
  it('never runs more than `concurrency` images, in priority order', async () => {
    const { loader, resolves } = harness({ concurrency: 3 })
    loader.want([10, 11, 12, 13, 14, 9])
    expect(resolves.map((d) => d.arg.split('-')[1])).toEqual(['11', '12', '13'])
    expect(loader.active).toBe(3)
  })

  it('a burst (fast scroll / jump) cancels what is no longer wanted', async () => {
    const { loader, resolves, flush } = harness({ concurrency: 3 })
    loader.want(prefetchOrder(0, 200))
    const first = resolves.slice()
    loader.want(prefetchOrder(30, 200)) // jump 30 pages
    await flush()
    expect(first.every((d) => d.signal.aborted)).toBe(true)
    expect(loader.active).toBe(3)
    expect(resolves.slice(3).map((d) => d.arg.split('-')[1])).toEqual(['31', '32', '33'])
    // 20 rapid position changes still never exceed the limit
    for (let c = 31; c < 51; c++) loader.want(prefetchOrder(c, 200))
    expect(loader.active).toBeLessThanOrEqual(3)
  })

  it('the current image preempts a prefetch when its page URL arrives late', async () => {
    let known0 = false
    const { loader, resolves } = harness({ concurrency: 2 }, (i) => i !== 0 || known0)
    loader.want([0, 1, 2])
    expect(resolves.map((d) => d.arg.split('-')[1])).toEqual(['2', '3'])
    known0 = true
    loader.pump()
    expect(resolves[1].signal.aborted).toBe(true) // lowest priority (index 2)
    expect(resolves[2].arg).toMatch(/-1$/)
    expect(loader.stats.preempts).toBe(1)
  })
})

describe('retry state machine', () => {
  it('error -> nl= retries with 1s/2s/4s backoff -> failed -> tap to reload', async () => {
    const { loader, resolves, loads, answer, flush } = harness({ hedgeMs: 0 })
    loader.want([0])
    await answer(resolves[0], 'a.hath.network', 'key1')
    expect(loader.getState(0).status).toBe('loading')
    loads[0].reject(new Error('image error'))
    await flush()
    expect(loader.getState(0)).toMatchObject({ status: 'waiting', attempt: 1 })
    await vi.advanceTimersByTimeAsync(999)
    expect(resolves).toHaveLength(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(resolves[1].arg).toMatch(/\?nl=key1$/) // another server
    await answer(resolves[1], 'b.hath.network', 'key2')
    loads[1].reject(new Error('image error'))
    await flush()
    await vi.advanceTimersByTimeAsync(2000)
    expect(resolves[2].arg).toMatch(/\?nl=key2$/)
    await answer(resolves[2], 'c.hath.network', 'key3')
    expect(loads[2].arg.startsWith('/api/gallery/proxy')).toBe(true) // 3rd try via proxy
    loads[2].reject(new Error('image error'))
    await flush()
    await vi.advanceTimersByTimeAsync(4000)
    await answer(resolves[3], 'd.hath.network', 'key4')
    loads[3].reject(new Error('image error'))
    await flush()
    expect(loader.getState(0).status).toBe('failed')
    expect(resolves).toHaveLength(4) // 1 + 3 retries, nothing more
    await vi.advanceTimersByTimeAsync(60000)
    expect(resolves).toHaveLength(4)
    // the visible button does the same: new server via nl=
    loader.reload(0)
    expect(resolves[4].arg).toMatch(/\?nl=key4$/)
    await answer(resolves[4], 'e.hath.network', 'key5')
    loads[4].resolve(undefined)
    await flush()
    expect(loader.getState(0)).toMatchObject({ status: 'loaded' })
  })

  it('a stalled download (dead H@H node) is abandoned and retried', async () => {
    const { loader, resolves, loads, answer } = harness({ stallMs: 15000, hedgeMs: 0 })
    loader.want([0])
    await answer(resolves[0])
    await vi.advanceTimersByTimeAsync(14999)
    expect(loads[0].signal.aborted).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(loads[0].signal.aborted).toBe(true)
    expect(loader.getState(0)).toMatchObject({ status: 'waiting', attempt: 1, error: 'stalled' })
    await vi.advanceTimersByTimeAsync(1000)
    expect(resolves[1].arg).toMatch(/\?nl=k1$/)
  })

  it('quota / login errors fail at once (no hammering)', async () => {
    const { loader, resolves, flush } = harness()
    loader.want([0])
    resolves[0].reject(new Error('[509] image viewing limit exceeded'))
    await flush()
    expect(loader.getState(0).status).toBe('failed')
    await vi.advanceTimersByTimeAsync(60000)
    expect(resolves).toHaveLength(1)
  })

  it('the current image gets a parallel nl= attempt when slow; the first to load wins', async () => {
    const { loader, resolves, loads, answer, flush } = harness({ hedgeMs: 4000 })
    loader.want([0, 1])
    await answer(resolves[0], 'slow.hath.network', 'key1')
    await answer(resolves[1])
    await vi.advanceTimersByTimeAsync(4000)
    const hedge = resolves[2]
    expect(hedge.arg).toMatch(/-1\?nl=key1$/)
    await answer(hedge, 'fast.hath.network', 'key2')
    const hedgeLoad = loads.find((d) => decodeURIComponent(d.arg).includes('fast'))!
    hedgeLoad.resolve('decoded')
    await flush()
    // a hanging direct load is hedged through the proxy (covers networks that cannot reach H@H)
    expect(loader.getState(0)).toMatchObject({ status: 'loaded', src: '/api/gallery/proxy?url=' + encodeURIComponent('https://fast.hath.network/h/1.webp') })
    expect(loads[0].signal.aborted).toBe(true) // the slow original is stopped
    expect(loader.stats.hedges).toBe(1)
  })

  it('a network that cannot reach H@H: hedges via the proxy, then stays on the proxy', async () => {
    const { loader, resolves, loads, answer, flush } = harness({ hedgeMs: 4000 })
    for (const i of [0, 1]) {
      loader.want([i])
      await answer(resolves[resolves.length - 1]) // direct load hangs
      await vi.advanceTimersByTimeAsync(4000)
      await answer(resolves[resolves.length - 1])
      expect(loads[loads.length - 1].arg).toMatch(/^\/api\/gallery\/proxy/)
      loads[loads.length - 1].resolve(undefined)
      await flush()
      expect(loader.getState(i).status).toBe('loaded')
    }
    expect(loader.preferProxy).toBe(true)
    loader.want([2])
    await answer(resolves[resolves.length - 1])
    expect(loads[loads.length - 1].arg).toMatch(/^\/api\/gallery\/proxy/)
  })

  it('dead node early in a session vs. blocked network: switching restarts hanging direct loads', async () => {
    const { loader, resolves, loads, answer, flush } = harness({ hedgeMs: 4000 })
    loader.want([0, 1, 2])
    for (const d of resolves.slice(0, 3)) await answer(d) // three direct loads hang
    await vi.advanceTimersByTimeAsync(4000) // current one hedged through the proxy
    await answer(resolves[3])
    loads[3].resolve(undefined)
    await flush()
    expect(loader.preferProxy).toBe(true)
    // the prefetches that were hanging on direct restart via the proxy, same URLs
    expect(loads[1].signal.aborted).toBe(true)
    expect(loads[2].signal.aborted).toBe(true)
    expect(loads.slice(4).map((d) => d.arg.startsWith('/api/gallery/proxy'))).toEqual([true, true])
    expect(resolves).toHaveLength(4)
  })

  it('occasional dead nodes do not turn direct loading off once direct works', async () => {
    const { loader, resolves, loads, answer, flush } = harness({ hedgeMs: 4000 })
    loader.want([0])
    await answer(resolves[0])
    loads[0].resolve(undefined) // a direct success
    await flush()
    loader.want([1])
    await answer(resolves[1])
    await vi.advanceTimersByTimeAsync(4000)
    await answer(resolves[2])
    loads[loads.length - 1].resolve(undefined) // rescued once
    await flush()
    expect(loader.preferProxy).toBe(false)
  })

  it('prefetched images are not hedged (only the current one)', async () => {
    const { loader, resolves, answer } = harness({ hedgeMs: 4000 })
    loader.want([0, 1])
    await answer(resolves[0])
    await answer(resolves[1])
    await vi.advanceTimersByTimeAsync(5000)
    expect(resolves).toHaveLength(3)
    expect(resolves[2].arg).toMatch(/-1\?nl=/)
  })
})

describe('mode switch and memory', () => {
  it('want([]) on a mode switch cancels prefetches; loaded images stay loaded and URLs are reused', async () => {
    const { loader, resolves, loads, answer, flush } = harness({ hedgeMs: 0 })
    loader.want([0, 1, 2])
    for (const d of resolves.slice(0, 3)) await answer(d)
    loads[0].resolve('img0')
    await flush()
    expect(loader.getState(0).status).toBe('loaded')
    loader.want([]) // old list unmounts
    expect(loads[1].signal.aborted).toBe(true)
    expect(loads[2].signal.aborted).toBe(true)
    expect(loader.getState(0).status).toBe('loaded')
    expect(loader.isRetained(0)).toBe(true)
    loader.want([0, 1, 2]) // new list mounts at the same index
    expect(resolves).toHaveLength(3) // resolved URLs reused, no new image page requests
    expect(loads.slice(3).map((d) => d.arg)).toEqual(['https://abc.hath.network/h/2.webp', 'https://abc.hath.network/h/3.webp'])
  })

  it('decoded images far from the current one are released', async () => {
    const { loader, resolves, loads, answer, flush } = harness({ hedgeMs: 0, keepAround: 3 })
    loader.want([0])
    await answer(resolves[0])
    loads[0].resolve('img0')
    await flush()
    loader.want([3])
    expect(loader.isRetained(0)).toBe(true)
    loader.want([4])
    expect(loader.isRetained(0)).toBe(false)
    expect(loader.getState(0).status).toBe('loaded')
  })

  it('URLs outside the direct host list go through the proxy', async () => {
    const { loader, resolves, loads, answer } = harness()
    loader.want([0])
    await answer(resolves[0], 'exhentai.org')
    expect(loads[0].arg).toMatch(/^\/api\/gallery\/proxy\?url=/)
  })

  it('direct failures that the proxy fixes switch the session to the proxy', async () => {
    const { loader, resolves, loads, answer, flush } = harness({ hedgeMs: 0, retryDelays: [0, 0, 0] })
    for (const i of [0, 1]) {
      loader.want([i])
      await answer(resolves[resolves.length - 1])
      loads[loads.length - 1].reject(new Error('image error')) // direct, server 1
      await flush(); await vi.advanceTimersByTimeAsync(0)
      await answer(resolves[resolves.length - 1])
      loads[loads.length - 1].reject(new Error('image error')) // direct, server 2
      await flush(); await vi.advanceTimersByTimeAsync(0)
      await answer(resolves[resolves.length - 1])
      expect(loads[loads.length - 1].arg).toMatch(/^\/api\/gallery\/proxy/)
      loads[loads.length - 1].resolve(undefined)
      await flush()
    }
    expect(loader.preferProxy).toBe(true)
    loader.want([2])
    await answer(resolves[resolves.length - 1])
    expect(loads[loads.length - 1].arg).toMatch(/^\/api\/gallery\/proxy/)
  })
})
