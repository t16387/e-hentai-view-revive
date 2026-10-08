/**
 * Query parameters forwarded to the site's list pages. The site ignores
 * `page=N` now and paginates with cursors (`next`/`prev` = a gid, or
 * `<gid>-<favtime>` on favorites), so `page` is gone. Everything else is
 * whitelisted and validated so arbitrary input never reaches the upstream
 * URL.
 */
const RULES = {
  f_search: (v) => v.length <= 500,
  f_cats: (v) => /^\d{1,4}$/.test(v) && +v <= 1023,
  advsearch: (v) => v === '1',
  f_sh: (v) => v === 'on',
  f_sto: (v) => v === 'on',
  f_sfl: (v) => v === 'on',
  f_sfu: (v) => v === 'on',
  f_sft: (v) => v === 'on',
  f_sr: (v) => v === 'on',
  f_srdd: (v) => /^[2-5]$/.test(v),
  f_sp: (v) => v === 'on',
  f_spf: (v) => /^\d{1,4}$/.test(v),
  f_spt: (v) => /^\d{1,4}$/.test(v),
  next: (v) => /^\d+(-\d+)?$/.test(v),
  prev: (v) => /^\d+(-\d+)?$/.test(v),
  seek: (v) => /^\d{4}-\d{2}-\d{2}$/.test(v),
  jump: (v) => /^\d{1,3}[dwmy]$/.test(v),
}

/**
 * @param {Record<string, unknown>} query express req.query
 * @param {string[]} [extra] additional allowed keys (e.g. favcat)
 * @returns {Record<string,string>} sorted, validated params
 */
function pickListParams(query = {}, extra = {}) {
  const rules = { ...RULES, ...extra }
  const out = {}
  Object.keys(rules)
    .sort()
    .forEach((key) => {
      const raw = query[key]
      if (typeof raw !== 'string') return
      const value = key === 'f_search' ? raw.trim() : raw
      if (value === '' || !rules[key](value)) return
      out[key] = value
    })
  // next and prev are mutually exclusive; next wins
  if (out.next && out.prev) delete out.prev
  return out
}

/** stable cache key: user scope (userCacheScope) + sorted params */
function listCacheKey(scope, user, params) {
  return `[g${user}] ${scope} ${JSON.stringify(params)}`
}

module.exports = { pickListParams, listCacheKey, RULES }
