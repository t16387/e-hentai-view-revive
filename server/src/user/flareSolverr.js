/**
 * FlareSolverr client for forums.e-hentai.org Cloudflare bypass (password login).
 * Never logs cookies, passwords, or HTML bodies.
 *
 * Env: EHV_FLARESOLVERR_URL — full /v1 endpoint, e.g.
 *   http://host.docker.internal:8191/v1   (Windows Docker Desktop → host-published solver)
 *   http://flaresolverr:8191/v1           (same compose network)
 *
 * Note: Byparr is FlareSolverr-compatible for request.get only (no request.post).
 */
const Axios = require('axios').default
const { UpstreamError } = require('../utils/fetchPage')

const DEFAULT_TIMEOUT_MS = 120000

/** Plain axios — do not inherit EHV_PROXY agents from the app client */
const rawAxios = Axios.create({
  proxy: false,
  maxRedirects: 0,
  validateStatus: () => true,
  headers: { 'Content-Type': 'application/json' },
})

function flaresolverrUrl() {
  const raw = (process.env.EHV_FLARESOLVERR_URL || '').trim()
  return raw || null
}

function isConfigured() {
  return !!flaresolverrUrl()
}

/**
 * @param {object} body FlareSolverr command payload
 * @returns {Promise<{ status: string, message?: string, solution?: object, session?: string }>}
 */
async function callFlareSolverr(body) {
  const url = flaresolverrUrl()
  if (!url) {
    throw new UpstreamError(
      'config',
      'EHV_FLARESOLVERR_URL is not set; cannot bypass Cloudflare for password login'
    )
  }
  const maxTimeout = Number(body.maxTimeout) || DEFAULT_TIMEOUT_MS
  let res
  try {
    res = await rawAxios.post(
      url,
      { ...body, maxTimeout },
      { timeout: maxTimeout + 30000 }
    )
  } catch (e) {
    throw new UpstreamError(
      'flaresolverr',
      `FlareSolverr unreachable (${
        (e && e.code) || 'error'
      }). Check EHV_FLARESOLVERR_URL and that the solver is running on that host/port.`
    )
  }

  const data = res.data
  if (!data || typeof data !== 'object') {
    throw new UpstreamError(
      'flaresolverr',
      `FlareSolverr returned a non-JSON response (HTTP ${res.status})`
    )
  }

  // Byparr / FastAPI style errors
  if (data.detail && !data.solution && data.status !== 'ok') {
    throw new UpstreamError(
      'flaresolverr',
      `FlareSolverr error: ${String(data.detail).slice(0, 240)}`
    )
  }

  if (data.status && data.status !== 'ok') {
    throw new UpstreamError(
      'flaresolverr',
      `FlareSolverr failed: ${String(
        data.message || data.status || 'error'
      ).slice(0, 240)}`
    )
  }

  return data
}

function cookiesFromSolution(solution) {
  const out = {}
  const list = (solution && solution.cookies) || []
  list.forEach((c) => {
    if (c && c.name != null && c.value != null)
      out[String(c.name)] = String(c.value)
  })
  return out
}

function cookieHeaderFromObj(obj) {
  return Object.entries(obj || {})
    .map(([k, v]) => `${k}=${v}`)
    .join('; ')
}

function solutionResult(data) {
  const solution = data.solution
  if (!solution) {
    throw new UpstreamError('flaresolverr', 'FlareSolverr returned no solution')
  }
  return {
    html: typeof solution.response === 'string' ? solution.response : '',
    cookies: cookiesFromSolution(solution),
    userAgent: solution.userAgent || '',
    status: solution.status,
    url: solution.url,
  }
}

async function solverGet(targetUrl, opts = {}) {
  const { maxTimeout = DEFAULT_TIMEOUT_MS, session, tabsTillVerify } = opts
  const body = { cmd: 'request.get', url: targetUrl, maxTimeout }
  if (session) body.session = session
  if (tabsTillVerify !== undefined && tabsTillVerify !== null) {
    body.tabs_till_verify = tabsTillVerify
  }
  return solutionResult(await callFlareSolverr(body))
}

async function solverPost(targetUrl, postData, opts = {}) {
  const { maxTimeout = DEFAULT_TIMEOUT_MS, session, cookies } = opts
  const body = {
    cmd: 'request.post',
    url: targetUrl,
    postData,
    maxTimeout,
  }
  if (session) body.session = session
  if (cookies && Object.keys(cookies).length) {
    body.cookies = Object.entries(cookies).map(([name, value]) => ({
      name,
      value,
    }))
  }
  return solutionResult(await callFlareSolverr(body))
}

async function createSession() {
  const data = await callFlareSolverr({ cmd: 'sessions.create' })
  if (!data.session) {
    throw new UpstreamError(
      'flaresolverr',
      'FlareSolverr did not return a session id'
    )
  }
  return data.session
}

async function destroySession(session) {
  if (!session) return
  try {
    await callFlareSolverr({ cmd: 'sessions.destroy', session })
  } catch (_) {
    /* best-effort */
  }
}

module.exports = {
  flaresolverrUrl,
  isConfigured,
  callFlareSolverr,
  cookiesFromSolution,
  cookieHeaderFromObj,
  solverGet,
  solverPost,
  createSession,
  destroySession,
  DEFAULT_TIMEOUT_MS,
}
