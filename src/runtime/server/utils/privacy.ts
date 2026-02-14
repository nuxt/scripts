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
 * Payload parameters that should be stripped (fingerprinting/tracking).
 *
 * Note: userId and userData are intentionally NOT stripped by stripPayloadFingerprinting.
 * Analytics services require user identifiers (cid, uid, fbp, etc.) and user data (ud, email)
 * to function correctly. These are listed here for documentation and param-detection tests only.
 * The privacy model strips device/browser fingerprinting while preserving user-level analytics IDs.
 */
export const STRIP_PARAMS = {
  // IP addresses (anonymized, not stripped)
  ip: ['uip', 'ip', 'client_ip_address', 'ip_address', 'user_ip', 'ipaddress', 'context.ip'],
  // User identifiers - intentionally preserved for analytics functionality
  userId: ['uid', 'user_id', 'userid', 'external_id', 'cid', '_gid', 'fbp', 'fbc', 'sid', 'session_id', 'sessionid', 'pl_id', 'p_user_id', 'uuid', 'anonymousid', 'twclid', 'u_c1', 'u_sclid', 'u_scsid'],
  // User data (PII) - intentionally preserved; hashed by analytics SDKs before sending
  userData: ['ud', 'user_data', 'userdata', 'email', 'phone', 'traits.email', 'traits.phone'],
  // Screen/Hardware fingerprinting (sh/sw = Snapchat screen height/width)
  screen: ['sr', 'vp', 'sd', 'screen', 'viewport', 'colordepth', 'pixelratio', 'sh', 'sw'],
  // Platform fingerprinting (d_a = architecture, d_ot = OS type, d_os = OS version)
  platform: ['plat', 'platform', 'hardwareconcurrency', 'devicememory', 'cpu', 'mem', 'd_a', 'd_ot', 'd_os'],
  // Browser fingerprinting (d_bvs = Snapchat browser versions)
  browser: ['plugins', 'fonts', 'd_bvs'],
  // Location/Timezone
  location: ['tz', 'timezone', 'timezoneoffset'],
  // Canvas/WebGL fingerprinting
  canvas: ['canvas', 'webgl', 'audiofingerprint'],
  // Combined device fingerprinting (X/Twitter dv param contains: timezone, locale, vendor, platform, screen, etc.)
  deviceInfo: ['dv', 'device_info', 'deviceinfo', 'bci', 'eci'],
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
  // We use a specific regex here for precision as it's the most reliable way
  // to extract browser info from UA strings without a heavy parser.
  const match = ua.match(/(Firefox|Edg|OPR|Opera|Safari|Chrome)\/(\d+)/)
  if (match) {
    const family = match[1] === 'Edg' ? 'Edge' : (match[1] === 'OPR' ? 'Opera' : match[1])
    const majorVersion = match[2]
    return `Mozilla/5.0 (compatible; ${family}/${majorVersion}.0)`
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
 * Recursively strip fingerprinting data from payload.
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

    if (matchesParam(key, STRIP_PARAMS.ip) && typeof value === 'string') {
      result[key] = anonymizeIP(value)
      continue
    }
    if (matchesParam(key, STRIP_PARAMS.screen)) {
      result[key] = generalizeScreen(value)
      continue
    }
    if (matchesParam(key, STRIP_PARAMS.platform) || matchesParam(key, STRIP_PARAMS.canvas)
      || matchesParam(key, STRIP_PARAMS.browser) || matchesParam(key, STRIP_PARAMS.location)
      || matchesParam(key, STRIP_PARAMS.deviceInfo)) {
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
