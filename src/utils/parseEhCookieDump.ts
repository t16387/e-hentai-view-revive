/**
 * Parse an EH/ExH cookie dump into the three session fields peers care about.
 * Accepts formats used by DevTools copies and by JHenTai clipboard detection:
 *   ipb_member_id=123; ipb_pass_hash=abc; igneous=xyz
 *   ipb_member_id: 123
 *   multi-line name/value pairs
 */

export type EhCookieFields = {
  ipb_member_id?: string
  ipb_pass_hash?: string
  igneous?: string
}

const KEYS = ['ipb_member_id', 'ipb_pass_hash', 'igneous'] as const

function pick(raw: string, key: string): string | undefined {
  // name=value or name: value; stop at ; or newline or end
  const re = new RegExp(`(?:^|[;\\s,])${key}\\s*[=:]\\s*([^;\\s\\n\\r]+)`, 'i')
  const m = raw.match(re)
  if (!m) return undefined
  const v = m[1].replace(/^["']|["']$/g, '').trim()
  return v || undefined
}

/**
 * Extract ipb_member_id, ipb_pass_hash, and optional igneous from free text.
 * Does not throw; missing keys are omitted.
 */
export function parseEhCookieDump(input: string): EhCookieFields {
  const raw = (input || '').trim()
  if (!raw) return {}
  const out: EhCookieFields = {}
  for (const key of KEYS) {
    const v = pick(raw, key)
    if (v && v !== 'mystery' && v !== 'deleted' && v !== 'null') {
      out[key] = v
    }
  }
  return out
}

export function hasRequiredEhCookies(fields: EhCookieFields): boolean {
  return !!(
    fields.ipb_member_id &&
    String(fields.ipb_member_id).trim() &&
    fields.ipb_pass_hash &&
    String(fields.ipb_pass_hash).trim()
  )
}

/** Forums login page peers load in WebView / desktop webview */
export const EH_FORUMS_LOGIN_URL =
  'https://forums.e-hentai.org/index.php?act=Login&CODE=00'
