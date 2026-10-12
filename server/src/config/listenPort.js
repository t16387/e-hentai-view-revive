/**
 * Resolve the Node listen port.
 *
 * Mental model — change the port in `.env`:
 * - Docker Compose: container always listens on PORT=8080; the browser hits
 *   EHV_HOST_PORT on the host (mapped to container 8080).
 * - Bare Node / start.bat / Next in dev: browser hits PORT (default below).
 *   If PORT is unset, EHV_HOST_PORT is an alias so one .env value works for
 *   both Compose host mapping and local listen.
 *
 * @param {NodeJS.ProcessEnv} [env]
 * @param {{ defaultPort?: number }} [opts]
 * @returns {number}
 */
function resolveListenPort(env = process.env, { defaultPort = 8080 } = {}) {
  const raw = env.PORT || env.EHV_HOST_PORT
  if (raw === undefined || raw === '') return defaultPort
  const n = Number(String(raw).trim())
  return Number.isFinite(n) && n > 0 ? n : defaultPort
}

module.exports = { resolveListenPort }
