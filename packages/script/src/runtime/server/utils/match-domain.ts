/**
 * Match a hostname against an allowlist pattern.
 *
 * Two wildcard shapes are supported:
 *
 * 1. Trailing TLD wildcard `host.<tld>.*` — matches a top-level domain suffix
 *    shaped like a real ccTLD or gTLD:
 *      - `com` (the canonical gTLD we care about)
 *      - any 2-letter ccTLD (`tw`, `jp`, `de`, ...)
 *      - regional `com.<cc>` or `co.<cc>` (e.g. `com.tw`, `co.jp`, `com.hk`)
 *
 *    The built-in `www.google.*` pattern uses Google's published domain list.
 *    It also supports `www.google.cat` and rejects unlisted suffixes.
 *    Used for geo-localized Google ccTLDs:
 *      `www.google.*` matches `www.google.com`, `www.google.com.tw`, `www.google.co.jp`.
 *
 *    The pattern is intentionally narrow: it rejects attacker-controlled
 *    suffixes like `www.google.foo.bar` (two arbitrary 3-letter labels) or
 *    `www.google.attacker.com` (long second-level label).
 *
 * 2. Leading subdomain wildcard `*.host.tld` — matches exactly one DNS label
 *    in front of the suffix. The wildcard label must be one or more non-dot
 *    chars; it does not match the bare suffix or multi-label prefixes.
 *
 *    Used for vendors that bucket clients across letter/hash-prefixed shards:
 *      `*.clarity.ms` matches `a.clarity.ms`, `www.clarity.ms`, `scripts.clarity.ms`.
 *      It does NOT match `clarity.ms` (no prefix) or `a.b.clarity.ms` (multi-label).
 *
 * Bare patterns also match subdomains, e.g. `google.com` matches `mail.google.com`.
 */
export function matchDomain(domain: string, pattern: string): boolean {
  // Keep the matcher self-contained so the Partytown resolver can serialize it.
  const TLD_WILDCARD_RE = /^(?:com|[a-z]{2}|(?:com|co)\.[a-z]{2})$/i
  const SUBDOMAIN_LABEL_RE = /^[^.]+$/
  if (!pattern.includes('*'))
    return domain === pattern || domain.endsWith(`.${pattern}`)

  // Leading subdomain wildcard: `*.host.tld` matches exactly one non-dot label.
  if (pattern.startsWith('*.') && pattern.startsWith('*')) {
    const suffix = pattern.slice(2) // drop leading "*."
    if (!domain.endsWith(`.${suffix}`))
      return false
    const label = domain.slice(0, -(suffix.length + 1))
    return SUBDOMAIN_LABEL_RE.test(label)
  }

  // Trailing TLD wildcard: only support a single trailing `*`. Any other
  // wildcard shape is rejected rather than silently allowed.
  if (!pattern.endsWith('*') || pattern.indexOf('*') !== pattern.length - 1)
    return false

  const prefix = pattern.slice(0, -1) // includes trailing dot, e.g. "www.google."
  if (!domain.startsWith(prefix))
    return false

  const tld = domain.slice(prefix.length)
  // Restrict Google's built-in pattern to Google's published domains.
  // Source: https://www.google.com/supported_domains
  if (pattern === 'www.google.*') {
    const supportedSuffixes = [
      'com',
      'ad',
      'ae',
      'com.af',
      'com.ag',
      'al',
      'am',
      'co.ao',
      'com.ar',
      'as',
      'at',
      'com.au',
      'az',
      'ba',
      'com.bd',
      'be',
      'bf',
      'bg',
      'com.bh',
      'bi',
      'bj',
      'com.bn',
      'com.bo',
      'com.br',
      'bs',
      'bt',
      'co.bw',
      'by',
      'com.bz',
      'ca',
      'cd',
      'cf',
      'cg',
      'ch',
      'ci',
      'co.ck',
      'cl',
      'cm',
      'cn',
      'com.co',
      'co.cr',
      'com.cu',
      'cv',
      'com.cy',
      'cz',
      'de',
      'dj',
      'dk',
      'dm',
      'com.do',
      'dz',
      'com.ec',
      'ee',
      'com.eg',
      'es',
      'com.et',
      'fi',
      'com.fj',
      'fm',
      'fr',
      'ga',
      'ge',
      'gg',
      'com.gh',
      'com.gi',
      'gl',
      'gm',
      'gr',
      'com.gt',
      'gy',
      'com.hk',
      'hn',
      'hr',
      'ht',
      'hu',
      'co.id',
      'ie',
      'co.il',
      'im',
      'co.in',
      'iq',
      'is',
      'it',
      'je',
      'com.jm',
      'jo',
      'co.jp',
      'co.ke',
      'com.kh',
      'ki',
      'kg',
      'co.kr',
      'com.kw',
      'kz',
      'la',
      'com.lb',
      'li',
      'lk',
      'co.ls',
      'lt',
      'lu',
      'lv',
      'com.ly',
      'co.ma',
      'md',
      'me',
      'mg',
      'mk',
      'ml',
      'com.mm',
      'mn',
      'com.mt',
      'mu',
      'mv',
      'mw',
      'com.mx',
      'com.my',
      'co.mz',
      'com.na',
      'com.ng',
      'com.ni',
      'ne',
      'nl',
      'no',
      'com.np',
      'nr',
      'nu',
      'co.nz',
      'com.om',
      'com.pa',
      'com.pe',
      'com.pg',
      'com.ph',
      'com.pk',
      'pl',
      'pn',
      'com.pr',
      'ps',
      'pt',
      'com.py',
      'com.qa',
      'ro',
      'ru',
      'rw',
      'com.sa',
      'com.sb',
      'sc',
      'se',
      'com.sg',
      'sh',
      'si',
      'sk',
      'com.sl',
      'sn',
      'so',
      'sm',
      'sr',
      'st',
      'com.sv',
      'td',
      'tg',
      'co.th',
      'com.tj',
      'tl',
      'tm',
      'tn',
      'to',
      'com.tr',
      'tt',
      'com.tw',
      'co.tz',
      'com.ua',
      'co.ug',
      'co.uk',
      'com.uy',
      'co.uz',
      'com.vc',
      'co.ve',
      'co.vi',
      'com.vn',
      'vu',
      'ws',
      'rs',
      'co.za',
      'co.zm',
      'co.zw',
      'cat',
    ]
    return supportedSuffixes.includes(tld.toLowerCase())
  }

  return TLD_WILDCARD_RE.test(tld)
}
