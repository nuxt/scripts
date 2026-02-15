/**
 * Headers that reveal user IP address - stripped in proxy mode,
 * anonymized in anonymize mode.
 */
export const IP_HEADERS = [
  'x-forwarded-for',
  'x-real-ip',
  'forwarded',
  'cf-connecting-ip',
  'true-client-ip',
  'x-client-ip',
  'x-cluster-client-ip',
]

/**
 * Headers that enable fingerprinting - normalized in anonymize mode.
 */
export const FINGERPRINT_HEADERS = [
  'user-agent',
  'accept-language',
  'accept-encoding',
  'sec-ch-ua',
  'sec-ch-ua-platform',
  'sec-ch-ua-mobile',
  'sec-ch-ua-full-version-list',
]

/**
 * Sensitive headers that should never be forwarded to third parties.
 */
export const SENSITIVE_HEADERS = [
  'cookie',
  'authorization',
  'proxy-authorization',
  'x-csrf-token',
  'www-authenticate',
]

/**
 * Payload parameters relevant to privacy.
 *
 * Note: userId and userData are intentionally NOT modified by stripPayloadFingerprinting.
 * Analytics services require user identifiers (cid, uid, fbp, etc.) and user data (ud, email)
 * to function correctly. These are listed here for documentation and param-detection tests only.
 * The privacy model anonymizes device/browser fingerprinting while preserving user-level analytics IDs.
 */
export const STRIP_PARAMS = {
  // IP addresses — anonymized to subnet
  ip: ['uip', 'ip', 'client_ip_address', 'ip_address', 'user_ip', 'ipaddress', 'context.ip'],
  // User identifiers — intentionally preserved for analytics functionality
  userId: ['uid', 'user_id', 'userid', 'external_id', 'cid', '_gid', 'fbp', 'fbc', 'sid', 'session_id', 'sessionid', 'pl_id', 'p_user_id', 'uuid', 'anonymousid', 'twclid', 'u_c1', 'u_sclid', 'u_scsid'],
  // User data (PII) — intentionally preserved; hashed by analytics SDKs before sending
  userData: ['ud', 'user_data', 'userdata', 'email', 'phone', 'traits.email', 'traits.phone'],
  // Screen/Hardware — generalized to common buckets
  screen: ['sr', 'vp', 'sd', 'screen', 'viewport', 'colordepth', 'pixelratio', 'sh', 'sw'],
  // Hardware capabilities — generalized to common buckets
  hardware: ['hardwareconcurrency', 'devicememory', 'cpu', 'mem'],
  // Platform identifiers — low entropy, kept as-is (e.g. "Linux", "x86")
  platform: ['plat', 'platform', 'd_a', 'd_ot'],
  // Version strings — generalized to major version only (d_os = Snapchat OS version, uapv = GA platform version)
  version: ['d_os', 'uapv'],
  // Browser version lists — generalized to major versions (d_bvs = Snapchat, uafvl = GA Client Hints)
  browserVersion: ['d_bvs', 'uafvl'],
  // Browser data lists — replaced with empty value
  browserData: ['plugins', 'fonts'],
  // Location/Timezone — generalized
  location: ['tz', 'timezone', 'timezoneoffset'],
  // Canvas/WebGL/Audio fingerprints — replaced with empty value (pure fingerprints, no analytics value)
  canvas: ['canvas', 'webgl', 'audiofingerprint'],
  // Combined device fingerprinting (X/Twitter dv param contains: timezone, locale, vendor, platform, screen, etc.)
  deviceInfo: ['dv', 'device_info', 'deviceinfo'],
}

/**
 * Parameters that should be normalized (not stripped).
 */
export const NORMALIZE_PARAMS = {
  language: ['ul', 'lang', 'language', 'languages'],
  userAgent: ['ua', 'useragent', 'user_agent', 'client_user_agent', 'context.useragent'],
}

/**
 * Anonymize an IP address by zeroing trailing segments.
 */
export function anonymizeIP(ip: string): string {
  if (ip.includes(':')) {
    // IPv6: keep first 3 segments (48 bits) — roughly city/ISP-level aggregation
    return ip.split(':').slice(0, 3).join(':') + '::'
  }
  // IPv4: zero last octet (/24 subnet — typically ISP/neighborhood-level precision)
  const parts = ip.split('.')
  if (parts.length === 4) {
    parts[3] = '0'
    return parts.join('.')
  }
  return ip
}

/**
 * Normalize User-Agent to browser family and major version only.
 */
export function normalizeUserAgent(ua: string): string {
  // Test tokens in specificity order — Edge/Opera UA strings also contain "Chrome" and "Safari",
  // so we must check for more-specific tokens first.
  const tokens: [pattern: string, family: string][] = [
    ['Edg/', 'Edge'],
    ['OPR/', 'Opera'],
    ['Opera/', 'Opera'],
    ['Firefox/', 'Firefox'],
    ['Chrome/', 'Chrome'],
    ['Safari/', 'Safari'],
  ]
  for (const [pattern, family] of tokens) {
    const idx = ua.indexOf(pattern)
    if (idx !== -1) {
      const versionStart = idx + pattern.length
      const majorVersion = ua.slice(versionStart).match(/^(\d+)/)?.[1]
      if (majorVersion)
        return `Mozilla/5.0 (compatible; ${family}/${majorVersion}.0)`
    }
  }
  return 'Mozilla/5.0 (compatible)'
}

/**
 * Normalize Accept-Language to primary language only.
 */
export function normalizeLanguage(lang: string): string {
  return lang.split(',')[0]?.split('-')[0]?.split(';')[0]?.trim() || 'en'
}

/**
 * Generalize screen resolution to common bucket.
 */
export function generalizeScreen(value: unknown): string {
  if (typeof value === 'string' && value.includes('x')) {
    const width = Number.parseInt(value.split('x')[0] || '0')
    if (width >= 2560) return '2560x1440'
    if (width >= 1920) return '1920x1080'
    if (width >= 1440) return '1440x900'
    if (width >= 1366) return '1366x768'
    return '1280x720'
  }
  return '1920x1080'
}

/**
 * Generalize hardware concurrency / device memory to common bucket.
 */
export function generalizeHardware(value: unknown): number {
  const num = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(num)) return 4
  if (num >= 16) return 16
  if (num >= 8) return 8
  if (num >= 4) return 4
  return 2
}

/**
 * Generalize a version string to major version only.
 * "6.17.0" → "6", "143.0.7499.4" → "143"
 */
export function generalizeVersion(value: unknown): string {
  if (typeof value !== 'string') return String(value)
  return value.match(/^(\d+)/)?.[1] || String(value)
}

/**
 * Generalize browser version list to major versions only.
 * Handles Snapchat d_bvs format: [,{"brand":"Chrome","version":"143.0.7499.4"}...]
 * Handles GA uafvl format: HeadlessChrome;143.0.7499.4|Chromium;143.0.7499.4|...
 */
export function generalizeBrowserVersions(value: unknown): string {
  if (typeof value !== 'string') return String(value)
  // Snapchat d_bvs: JSON with version fields
  if (value.includes('"version"'))
    return value.replace(/("version"\s*:\s*")(\d+)\.[^"]*(")/g, '$1$2.0$3')
  // GA uafvl: semicolon-separated brand;version pairs, pipe-delimited
  if (value.includes(';'))
    return value.replace(/;(\d+)\.[^|]*/g, ';$1.0')
  return value
}

/**
 * Generalize timezone to reduce precision.
 * IANA names → UTC offset string, numeric offsets → bucketed to 3-hour intervals.
 */
export function generalizeTimezone(value: unknown): string | number {
  if (typeof value === 'number') {
    // timezoneoffset in minutes — bucket to 3-hour intervals
    return Math.round(value / 180) * 180
  }
  if (typeof value === 'string') {
    // IANA timezone name → replace with generic UTC offset
    // This reduces ~400 IANA zones to ~25 offset buckets
    return 'UTC'
  }
  return 0
}

/**
 * Recursively anonymize fingerprinting data in payload.
 * Fields are generalized or normalized rather than stripped, so endpoints
 * still receive valid data with reduced fingerprinting precision.
 */
export function stripPayloadFingerprinting(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(payload)) {
    const lowerKey = key.toLowerCase()

    const isLanguageParam = NORMALIZE_PARAMS.language.some(p => lowerKey === p.toLowerCase())
    const isUserAgentParam = NORMALIZE_PARAMS.userAgent.some(p => lowerKey === p.toLowerCase())

    if ((isLanguageParam || isUserAgentParam) && typeof value === 'string') {
      result[key] = isLanguageParam ? normalizeLanguage(value) : normalizeUserAgent(value)
      continue
    }

    const matchesParam = (key: string, params: string[]) => {
      const lk = key.toLowerCase()
      return params.some((p) => {
        const lp = p.toLowerCase()
        return lk === lp || lk.startsWith(lp + '[')
      })
    }

    // Anonymize IP to subnet
    if (matchesParam(key, STRIP_PARAMS.ip) && typeof value === 'string') {
      result[key] = anonymizeIP(value)
      continue
    }
    // Generalize screen to common bucket
    if (matchesParam(key, STRIP_PARAMS.screen)) {
      result[key] = generalizeScreen(value)
      continue
    }
    // Generalize hardware to common bucket
    if (matchesParam(key, STRIP_PARAMS.hardware)) {
      result[key] = generalizeHardware(value)
      continue
    }
    // Generalize version strings to major version
    if (matchesParam(key, STRIP_PARAMS.version)) {
      result[key] = generalizeVersion(value)
      continue
    }
    // Generalize browser version lists to major versions
    if (matchesParam(key, STRIP_PARAMS.browserVersion)) {
      result[key] = generalizeBrowserVersions(value)
      continue
    }
    // Generalize timezone
    if (matchesParam(key, STRIP_PARAMS.location)) {
      result[key] = generalizeTimezone(value)
      continue
    }
    // Replace browser data lists with empty value
    if (matchesParam(key, STRIP_PARAMS.browserData)) {
      result[key] = Array.isArray(value) ? [] : ''
      continue
    }
    // Replace canvas/webgl/audio fingerprints with empty value
    if (matchesParam(key, STRIP_PARAMS.canvas)) {
      result[key] = typeof value === 'number' ? 0 : typeof value === 'object' ? {} : ''
      continue
    }
    // Replace combined device info with empty value
    if (matchesParam(key, STRIP_PARAMS.deviceInfo)) {
      result[key] = ''
      continue
    }
    // Platform identifiers are low entropy — keep as-is
    if (matchesParam(key, STRIP_PARAMS.platform)) {
      result[key] = value
      continue
    }

    if (Array.isArray(value)) {
      result[key] = value.map(item =>
        typeof item === 'object' && item !== null
          ? stripPayloadFingerprinting(item as Record<string, unknown>)
          : item,
      )
    }
    else if (typeof value === 'object' && value !== null) {
      result[key] = stripPayloadFingerprinting(value as Record<string, unknown>)
    }
    else {
      result[key] = value
    }
  }

  return result
}
