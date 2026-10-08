/**
 * Reader image pipeline: image page -> full image URL -> preloaded image,
 * with a small priority queue, prefetch in reading direction, cancellation,
 * stall detection and automatic nl= retries (the site's "Reload broken
 * image" mechanism: re-request the image page with ?nl=<key> to be sent to
 * another H@H server).
 *
 * Pure logic, no React; browser specifics (fetching the image page,
 * preloading an image) are injected so it can be unit tested with fake
 * timers (test/client/imageLoader.test.ts).
 */

export type ImageStatus =
  | 'idle' // not started (or cancelled), will start when wanted
  | 'resolving' // asking the server for the image URL (image page)
  | 'loading' // downloading the image
  | 'waiting' // backing off before the next attempt
  | 'loaded'
  | 'failed' // retries used up: the UI shows "Tap to reload"

export type ImageVia = 'direct' | 'proxy'

export interface ImageState {
  status: ImageStatus
  /** src for the <img>, set once loaded */
  src?: string
  /** 0 = first try, 1.. = nl= retries */
  attempt: number
  error?: string
}

export interface ResolvedImage {
  url: string
  /** nl key of the image page ("Reload broken image"), '' if none */
  retryKey: string
}

export interface LoaderDeps {
  /** image page URL (/s/<imgkey>/<gid>-<n>) of an index, once known */
  pageUrlOf(index: number): string | undefined
  /** image page (optionally ?nl=<key>) -> full image URL + next nl key */
  resolve(pageUrl: string, signal: AbortSignal): Promise<ResolvedImage>
  /**
   * download (and decode) an image; reject on error, honour the signal.
   * May resolve with a handle (the decoded image) that is kept in memory
   * while the image is near the current one, so mode switches are instant.
   */
  load(
    src: string,
    opts: { signal: AbortSignal; priority: 'high' | 'low' }
  ): Promise<unknown>
  /** <img> src for an image URL loaded directly or via /api/gallery/proxy */
  toSrc(url: string, via: ImageVia): string
  /** whether an URL may be loaded straight from the browser */
  canLoadDirect?(url: string): boolean
  setTimeout?: (fn: () => void, ms: number) => unknown
  clearTimeout?: (id: unknown) => void
  now?: () => number
}

export interface LoaderOptions {
  /** images resolved/downloaded at the same time (current one preempts) */
  concurrency?: number
  /** an image that has not loaded after this long counts as failed */
  stallMs?: number
  /** delay before retry n (its length = number of automatic retries) */
  retryDelays?: number[]
  /** try H@H directly before going through the proxy */
  direct?: boolean
  /** reuse a resolved URL for this long (server caches 120 s) */
  resolvedTtlMs?: number
  /**
   * the current image still loading after this long: ask for another
   * server (nl=) in parallel and keep whichever finishes first (0 = off)
   */
  hedgeMs?: number
  /** keep decoded images within this distance of the current one */
  keepAround?: number
}

export const DEFAULT_LOADER_OPTIONS: Required<LoaderOptions> = {
  concurrency: 3,
  stallMs: 15000,
  retryDelays: [1000, 2000, 4000],
  direct: true,
  resolvedTtlMs: 90000,
  hedgeMs: 4000,
  keepAround: 3,
}

/** errors that a retry cannot fix (quota, login, removed gallery, bad page) */
export function isFatalError(message: string) {
  return /^\[(509|image|sad panda|404|cloudflare|banned)\]|No login/.test(
    message || ''
  )
}

/** delay before retry `attempt` (1-based), or null when retries are used up */
export function retryDelay(attempt: number, delays: number[]) {
  return attempt >= 1 && attempt <= delays.length ? delays[attempt - 1] : null
}

/**
 * How attempt n is made. 0: plain image page; 1+: ?nl= (another server).
 * Direct loading is tried on the first two attempts, then the proxy, which
 * also covers networks that cannot reach H@H nodes directly.
 */
export function attemptPlan(
  attempt: number,
  opts: { direct: boolean; preferProxy: boolean }
): { nl: boolean; via: ImageVia } {
  const direct = opts.direct && !opts.preferProxy && attempt <= 1
  return { nl: attempt > 0, via: direct ? 'direct' : 'proxy' }
}

/**
 * Indices to load, highest priority first: the current image, `ahead`
 * images in reading direction, then `behind` images before it.
 */
export function prefetchOrder(
  current: number,
  total: number,
  { ahead = 4, behind = 1 }: { ahead?: number; behind?: number } = {}
) {
  const res: number[] = []
  if (!(total > 0)) return res
  const c = Math.min(Math.max(0, Math.trunc(current) || 0), total - 1)
  res.push(c)
  for (let k = 1; k <= ahead && c + k < total; k++) res.push(c + k)
  for (let k = 1; k <= behind && c - k >= 0; k++) res.push(c - k)
  return res
}

const IDLE: ImageState = { status: 'idle', attempt: 0 }

interface Entry {
  index: number
  state: ImageState
  /** bumps on every start/cancel; stale async results are ignored */
  run: number
  ctrl?: AbortController
  timer?: unknown
  resolved?: ResolvedImage & { at: number; nl: string }
  /** nl key to use for the next attempt */
  nlKey: string
  /** a direct attempt of this image failed */
  directFailed?: boolean
  /** decoded image kept in memory while near the current one */
  handle?: unknown
  loadStartedAt?: number
  hedgeTimer?: unknown
  hedgeCtrl?: AbortController
  hedged?: boolean
  /** how the running attempt loads its image */
  via?: ImageVia
  /** the original attempt failed while its hedge was still running */
  mainFailed?: { message: string; via: ImageVia }
}

type Listener = (state: ImageState) => void

export class ImageLoader {
  private deps: LoaderDeps
  private opts: Required<LoaderOptions>
  private entries = new Map<number, Entry>()
  private listeners = new Map<number, Set<Listener>>()
  private order: number[] = []
  private wanted = new Set<number>()
  /** direct loads failed but the proxy worked */
  private proxyRescues = 0
  private directSuccesses = 0
  private destroyed = false
  stats = {
    resolves: 0,
    loads: 0,
    failures: 0,
    cancels: 0,
    preempts: 0,
    hedges: 0,
  }

  constructor(deps: LoaderDeps, opts: LoaderOptions = {}) {
    this.deps = deps
    this.opts = { ...DEFAULT_LOADER_OPTIONS, ...opts }
  }

  /**
   * Stay on the proxy for this session when direct loading looks blocked:
   * the proxy rescued an image before any direct load ever worked, or it
   * keeps rescuing far more often than direct loads succeed.
   */
  get preferProxy() {
    return (
      (this.proxyRescues >= 1 && this.directSuccesses === 0) ||
      this.proxyRescues > this.directSuccesses + 2
    )
  }

  private rescued() {
    const before = this.preferProxy
    this.proxyRescues++
    if (before || !this.preferProxy) return
    // just switched to the proxy: restart direct loads that are hanging
    this.entries.forEach((e) => {
      if (e.state.status === 'loading' && e.via === 'direct') this.cancel(e)
    })
  }

  setDirect(direct: boolean) {
    this.opts.direct = direct
  }

  getState(index: number): ImageState {
    return this.entries.get(index)?.state || IDLE
  }

  subscribe(index: number, fn: Listener) {
    let set = this.listeners.get(index)
    if (!set) this.listeners.set(index, (set = new Set()))
    set.add(fn)
    return () => {
      set!.delete(fn)
      if (set!.size === 0) this.listeners.delete(index)
    }
  }

  /** number of images being resolved or downloaded right now */
  get active() {
    let n = 0
    this.entries.forEach((e) => {
      if (e.state.status === 'resolving' || e.state.status === 'loading') n++
    })
    return n
  }

  /**
   * Replace the set of wanted images (priority order). Anything in flight
   * that is no longer wanted is cancelled (jump, fast scroll, mode switch);
   * loaded images stay loaded.
   */
  want(order: number[]) {
    if (this.destroyed) return
    this.order = Array.from(new Set(order))
    this.wanted = new Set(this.order)
    const center = this.order[0]
    this.entries.forEach((e) => {
      // want([]) (mode switch) keeps them: the next list shows them at once
      if (
        e.handle !== undefined &&
        center !== undefined &&
        Math.abs(e.index - center) > this.opts.keepAround
      )
        e.handle = undefined
      if (this.wanted.has(e.index)) return
      const s = e.state.status
      if (s === 'resolving' || s === 'loading' || s === 'waiting') {
        this.cancel(e)
        this.stats.cancels++
      }
    })
    this.pump()
  }

  /** thumbnail pages arrived (new page URLs): start what can start now */
  pump() {
    if (this.destroyed) return
    const startable = (i: number) => {
      const e = this.entries.get(i)
      return (!e || e.state.status === 'idle') && !!this.deps.pageUrlOf(i)
    }
    // the current image never waits behind prefetches
    const first = this.order[0]
    if (
      first !== undefined &&
      startable(first) &&
      this.active >= this.opts.concurrency
    ) {
      for (let k = this.order.length - 1; k > 0; k--) {
        const e = this.entries.get(this.order[k])
        if (
          e &&
          (e.state.status === 'resolving' || e.state.status === 'loading')
        ) {
          this.cancel(e)
          this.stats.preempts++
          break
        }
      }
    }
    for (const i of this.order) {
      if (this.active >= this.opts.concurrency) break
      if (startable(i)) this.start(this.entry(i))
    }
    const cur = first !== undefined && this.entries.get(first)
    if (cur) this.maybeHedge(cur)
  }

  /** whether a decoded image is being kept in memory (tests) */
  isRetained(index: number) {
    return this.entries.get(index)?.handle !== undefined
  }

  /** the visible <img> failed after a successful preload */
  reportError(index: number, src?: string) {
    const e = this.entries.get(index)
    if (!e || e.state.status !== 'loaded') return
    if (src && e.state.src !== src) return
    this.fail(
      e,
      'image error',
      e.state.src ? this.viaOf(e.state.src) : undefined
    )
  }

  /** "Tap to reload": a fresh round of nl= retries */
  reload(index: number) {
    const e = this.entry(index)
    if (e.state.status === 'resolving' || e.state.status === 'loading') return
    this.cancel(e)
    e.resolved = undefined
    this.set(e, { status: 'idle', attempt: e.nlKey ? 1 : 0 })
    if (!this.wanted.has(index)) {
      this.order = [index, ...this.order]
      this.wanted.add(index)
    }
    this.pump()
  }

  destroy() {
    this.destroyed = true
    this.entries.forEach((e) => this.cancel(e))
    this.listeners.clear()
  }

  // ---------------------------------------------------------------------

  private entry(index: number) {
    let e = this.entries.get(index)
    if (!e) {
      e = { index, state: IDLE, run: 0, nlKey: '' }
      this.entries.set(index, e)
    }
    return e
  }

  private set(e: Entry, state: ImageState) {
    e.state = state
    this.listeners.get(e.index)?.forEach((fn) => fn(state))
  }

  private timeout(fn: () => void, ms: number) {
    return (this.deps.setTimeout || setTimeout)(fn, ms)
  }

  private clear(id: unknown) {
    if (id !== undefined)
      (this.deps.clearTimeout || clearTimeout)(
        id as ReturnType<typeof setTimeout>
      )
  }

  private now() {
    return (this.deps.now || Date.now)()
  }

  private viaOf(src: string): ImageVia {
    return src.startsWith('/api/gallery/proxy') ? 'proxy' : 'direct'
  }

  /** stop whatever the entry is doing and make it startable again */
  private cancel(e: Entry) {
    e.run++
    this.clear(e.timer)
    e.timer = undefined
    if (e.ctrl) e.ctrl.abort()
    e.ctrl = undefined
    this.stopHedge(e)
    const s = e.state.status
    if (s === 'resolving' || s === 'loading' || s === 'waiting')
      this.set(e, { status: 'idle', attempt: e.state.attempt })
  }

  private async start(e: Entry) {
    const run = ++e.run
    const attempt = e.state.attempt
    const plan = attemptPlan(attempt, {
      direct: this.opts.direct,
      preferProxy: this.preferProxy,
    })
    const ctrl = new AbortController()
    e.ctrl = ctrl
    e.hedged = false
    e.mainFailed = undefined
    const pageUrl = this.deps.pageUrlOf(e.index)!
    const nl = plan.nl ? e.nlKey : ''
    const alive = () => e.run === run && !this.destroyed
    let via: ImageVia = plan.via
    try {
      let resolved = e.resolved
      if (
        !resolved ||
        resolved.nl !== nl ||
        this.now() - resolved.at > this.opts.resolvedTtlMs
      ) {
        this.set(e, { status: 'resolving', attempt })
        this.stats.resolves++
        const page = nl ? `${pageUrl}?nl=${encodeURIComponent(nl)}` : pageUrl
        const r = await this.deps.resolve(page, ctrl.signal)
        if (!alive()) return
        resolved = { ...r, at: this.now(), nl }
        e.resolved = resolved
      }
      if (resolved.retryKey) e.nlKey = resolved.retryKey
      if (
        via === 'direct' &&
        this.deps.canLoadDirect &&
        !this.deps.canLoadDirect(resolved.url)
      )
        via = 'proxy'
      const src = this.deps.toSrc(resolved.url, via)
      e.via = via
      e.loadStartedAt = this.now()
      this.set(e, { status: 'loading', attempt })
      this.stats.loads++
      if (this.order[0] === e.index) this.maybeHedge(e)
      // a stalled download (dead H@H node) counts as a failure
      let stalled = false
      e.timer = this.timeout(() => {
        stalled = true
        ctrl.abort()
      }, this.opts.stallMs)
      let handle: unknown
      try {
        handle = await this.deps.load(src, {
          signal: ctrl.signal,
          priority: this.order[0] === e.index ? 'high' : 'low',
        })
      } catch (err) {
        if (stalled && alive()) throw new Error('stalled')
        throw err
      } finally {
        this.clear(e.timer)
        e.timer = undefined
      }
      if (!alive()) return
      e.ctrl = undefined
      this.stopHedge(e)
      if (via === 'proxy' && e.directFailed) this.rescued()
      if (via === 'direct') this.directSuccesses++
      e.handle = handle
      this.set(e, { status: 'loaded', attempt, src })
      this.pump()
    } catch (err) {
      if (!alive()) return
      e.ctrl = undefined
      const message = (err as Error)?.message || 'error'
      // a hedge for this image is still running: let it decide
      if (e.hedgeCtrl) {
        e.mainFailed = { message, via }
        return
      }
      this.stopHedge(e)
      this.fail(e, message, via)
    }
  }

  private stopHedge(e: Entry) {
    this.clear(e.hedgeTimer)
    e.hedgeTimer = undefined
    if (e.hedgeCtrl) e.hedgeCtrl.abort()
    e.hedgeCtrl = undefined
  }

  /** schedule the parallel nl= attempt for the current image */
  private maybeHedge(e: Entry) {
    if (
      this.opts.hedgeMs <= 0 ||
      e.hedged ||
      e.hedgeTimer !== undefined ||
      e.state.status !== 'loading'
    )
      return
    const run = e.run
    const wait = Math.max(
      0,
      (e.loadStartedAt || 0) + this.opts.hedgeMs - this.now()
    )
    e.hedgeTimer = this.timeout(() => {
      e.hedgeTimer = undefined
      if (
        e.run !== run ||
        e.state.status !== 'loading' ||
        this.order[0] !== e.index
      )
        return
      this.hedge(e, run)
    }, wait)
  }

  private async hedge(e: Entry, run: number) {
    e.hedged = true
    this.stats.hedges++
    const ctrl = new AbortController()
    e.hedgeCtrl = ctrl
    const attempt = e.state.attempt
    // another server AND the other path: a direct load that hangs may be
    // a dead node or a network that cannot reach H@H at all
    const mainVia = e.via
    let via: ImageVia = mainVia === 'direct' ? 'proxy' : 'direct'
    if (!this.opts.direct || this.preferProxy) via = 'proxy'
    const pageUrl = this.deps.pageUrlOf(e.index)
    const nl = e.nlKey
    try {
      if (!pageUrl) throw new Error('no page url')
      this.stats.resolves++
      const r = await this.deps.resolve(
        nl ? `${pageUrl}?nl=${encodeURIComponent(nl)}` : pageUrl,
        ctrl.signal
      )
      if (e.run !== run) return
      if (r.retryKey) e.nlKey = r.retryKey
      if (
        via === 'direct' &&
        this.deps.canLoadDirect &&
        !this.deps.canLoadDirect(r.url)
      )
        via = 'proxy'
      const src = this.deps.toSrc(r.url, via)
      this.stats.loads++
      const handle = await this.deps.load(src, {
        signal: ctrl.signal,
        priority: 'high',
      })
      if (e.run !== run) return
      // the hedge won: stop the original download
      e.run++
      this.clear(e.timer)
      e.timer = undefined
      if (e.ctrl) e.ctrl.abort()
      e.ctrl = undefined
      e.hedgeCtrl = undefined
      e.resolved = { ...r, at: this.now(), nl }
      e.handle = handle
      e.via = via
      if (mainVia === 'direct' && via === 'proxy') {
        e.directFailed = true
        this.rescued()
      }
      this.set(e, { status: 'loaded', attempt, src })
      this.pump()
    } catch (err) {
      if (e.hedgeCtrl === ctrl) e.hedgeCtrl = undefined
      if (e.run !== run) return
      // both the original and the hedge failed
      if (e.mainFailed) {
        const { message, via: mainVia } = e.mainFailed
        e.mainFailed = undefined
        this.fail(e, message, mainVia)
      }
    }
  }

  private fail(e: Entry, message: string, via?: ImageVia) {
    this.stats.failures++
    if (via === 'direct') e.directFailed = true
    // the resolved URL points at the broken server: ask for another one
    e.resolved = undefined
    const next = e.state.attempt + 1
    const delay = isFatalError(message)
      ? null
      : retryDelay(next, this.opts.retryDelays)
    if (delay === null) {
      this.stopHedge(e)
      this.set(e, {
        status: 'failed',
        attempt: e.state.attempt,
        error: message,
      })
      this.pump()
      return
    }
    const run = ++e.run
    this.stopHedge(e)
    this.set(e, { status: 'waiting', attempt: next, error: message })
    e.timer = this.timeout(() => {
      if (e.run !== run) return
      e.timer = undefined
      this.set(e, { status: 'idle', attempt: next })
      this.pump()
    }, delay)
    // the slot is free while backing off
    this.pump()
  }
}
