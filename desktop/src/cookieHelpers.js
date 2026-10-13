/**
 * Pure helpers for extracting EH session cookies from Electron session.cookies
 * results (or mocked arrays). No Electron import — unit-testable in Node.
 */

const REQUIRED = ['ipb_member_id', 'ipb_pass_hash']
const OPTIONAL = ['igneous']
const INTERESTING = [...REQUIRED, ...OPTIONAL]

/** Domains we care about when scanning the login WebView session */
const EH_COOKIE_DOMAINS = [
  'e-hentai.org',
  '.e-hentai.org',
  'forums.e-hentai.org',
  '.forums.e-hentai.org',
  'exhentai.org',
  '.exhentai.org',
]

/**
 * @typedef {{ name: string, value: string, domain?: string }} ElectronCookieLike
 * @typedef {{ ipb_member_id?: string, ipb_pass_hash?: string, igneous?: string }} EhSessionCookies
 */

/**
 * Map a list of cookie objects into the three EH session fields.
 * Later cookies with the same name overwrite earlier ones (prefer last write).
 * Skips empty / mystery / deleted values.
 * @param {ElectronCookieLike[]} cookies
 * @returns {EhSessionCookies}
 */
function pickEhCookies(cookies) {
  /** @type {EhSessionCookies} */
  const out = {}
  if (!Array.isArray(cookies)) return out
  for (const c of cookies) {
    if (!c || !c.name) continue
    const name = String(c.name)
    if (!INTERESTING.includes(name)) continue
    const value = c.value == null ? '' : String(c.value).trim()
    if (!value || value === 'mystery' || value === 'deleted' || value === 'null') {
      continue
    }
    out[/** @type {keyof EhSessionCookies} */ (name)] = value
  }
  return out
}

/**
 * @param {EhSessionCookies} fields
 * @returns {boolean}
 */
function hasRequiredEhCookies(fields) {
  return !!(
    fields &&
    fields.ipb_member_id &&
    String(fields.ipb_member_id).trim() &&
    fields.ipb_pass_hash &&
    String(fields.ipb_pass_hash).trim()
  )
}

/**
 * Merge cookie lists from several domain queries (dedupe by name, last wins).
 * @param {...ElectronCookieLike[]} lists
 * @returns {EhSessionCookies}
 */
function mergeCookieLists(...lists) {
  const flat = []
  for (const list of lists) {
    if (Array.isArray(list)) flat.push(...list)
  }
  return pickEhCookies(flat)
}

const EH_FORUMS_LOGIN_URL =
  'https://forums.e-hentai.org/index.php?act=Login&CODE=00'

const EH_EXHENTAI_URL = 'https://exhentai.org/'

module.exports = {
  REQUIRED,
  OPTIONAL,
  INTERESTING,
  EH_COOKIE_DOMAINS,
  EH_FORUMS_LOGIN_URL,
  EH_EXHENTAI_URL,
  pickEhCookies,
  hasRequiredEhCookies,
  mergeCookieLists,
}
