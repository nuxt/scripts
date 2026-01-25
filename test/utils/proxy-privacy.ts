// Parameters that should be stripped or anonymized
export const STRIP_PARAMS = {
  // IP addresses
  ip: ['uip', 'ip', 'client_ip_address', 'ip_address', 'user_ip', 'ipAddress', 'context.ip'],

  // User identifiers
  userId: ['uid', 'user_id', 'userId', 'external_id', 'cid', '_gid', 'fbp', 'fbc', 'sid', 'session_id', 'sessionid', 'pl_id', 'p_user_id', 'uuid', 'anonymousId', 'twclid'],

  // User data (PII) - includes email, phone
  userData: ['ud', 'user_data', 'userData', 'email', 'phone', 'traits.email', 'traits.phone'],

  // Screen/Hardware fingerprinting
  screen: ['sr', 'vp', 'sd', 'screen', 'viewport', 'colorDepth', 'pixelRatio'],

  // Platform fingerprinting
  platform: ['plat', 'platform', 'hardwareConcurrency', 'deviceMemory', 'cpu', 'mem'],

  // Browser fingerprinting
  browser: ['ua', 'userAgent', 'client_user_agent', 'plugins', 'fonts'],

  // Location/Timezone
  location: ['tz', 'timezone', 'timezoneOffset'],

  // Canvas/WebGL fingerprinting
  canvas: ['canvas', 'webgl', 'audioFingerprint'],

  // Combined device info (X/Twitter dv param, context indicators)
  deviceInfo: ['dv', 'device_info', 'deviceinfo', 'bci', 'eci'],
}

// Parameters that should be normalized (not stripped)
export const NORMALIZE_PARAMS = {
  // Language - keep primary only
  language: ['ul', 'lang', 'language', 'languages'],

  // User agent - keep browser family only
  userAgent: ['ua', 'userAgent', 'user_agent', 'client_user_agent', 'context.userAgent'],
}

// Parameters that are OK to forward
export const ALLOWED_PARAMS = {
  // Page context (needed for analytics)
  page: ['dt', 'dl', 'dr', 'de'], // title, location, referrer, encoding

  // Event data
  event: ['en', 'ep', 'ev', 'ec', 'ea', 'el'], // event name, params, value, category, action, label

  // Timestamps
  time: ['z', '_s', 'timestamp'],
}

export function anonymizeIP(ip: string): string {
  if (ip.includes(':')) {
    const parts = ip.split(':')
    return parts.slice(0, 3).join(':') + '::'
  }
  const parts = ip.split('.')
  if (parts.length === 4) {
    parts[3] = '0'
    return parts.join('.')
  }
  return ip
}

export function normalizeLanguage(lang: string): string {
  const primary = lang.split(',')[0]?.split('-')[0]?.split(';')[0]?.trim()
  return primary || 'en'
}

export function normalizeUserAgent(ua: string): string {
  if (ua.includes('Firefox/')) return 'Mozilla/5.0 (compatible; Firefox)'
  if (ua.includes('Edg/')) return 'Mozilla/5.0 (compatible; Edge)'
  if (ua.includes('OPR/') || ua.includes('Opera/')) return 'Mozilla/5.0 (compatible; Opera)'
  if (ua.includes('Safari/') && !ua.includes('Chrome/')) return 'Mozilla/5.0 (compatible; Safari)'
  if (ua.includes('Chrome/')) return 'Mozilla/5.0 (compatible; Chrome)'
  return 'Mozilla/5.0 (compatible)'
}

export function generalizeScreen(value: unknown): string {
  // Generalize to common buckets to prevent unique identification
  if (typeof value === 'string') {
    const match = value.match(/(\d+)x(\d+)/)
    if (match) {
      const width = Number.parseInt(match[1])
      // Bucket to common resolutions
      if (width >= 2560) return '2560x1440'
      if (width >= 1920) return '1920x1080'
      if (width >= 1440) return '1440x900'
      if (width >= 1366) return '1366x768'
      return '1280x720'
    }
  }
  if (typeof value === 'object' && value !== null) {
    const screen = value as { width?: number, height?: number }
    if (screen.width) {
      if (screen.width >= 2560) return '2560x1440'
      if (screen.width >= 1920) return '1920x1080'
      if (screen.width >= 1440) return '1440x900'
      if (screen.width >= 1366) return '1366x768'
      return '1280x720'
    }
  }
  return '1920x1080' // Default bucket
}

// Helper functions for the proxy handler
export function stripFingerprintingFromPayload(
  payload: Record<string, unknown>,
  mode: 'strict' | 'anonymize',
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(payload)) {
    const lowerKey = key.toLowerCase()

    // Check if this should be normalized FIRST (takes priority over stripping)
    const isLanguageParam = NORMALIZE_PARAMS.language.some(p => lowerKey === p.toLowerCase())
    const isUserAgentParam = NORMALIZE_PARAMS.userAgent.some(p => lowerKey === p.toLowerCase())
    const shouldNormalize = isLanguageParam || isUserAgentParam

    if (shouldNormalize && typeof value === 'string') {
      if (isLanguageParam) {
        result[key] = normalizeLanguage(value)
      }
      else if (isUserAgentParam) {
        result[key] = normalizeUserAgent(value)
      }
      continue
    }

    // Check if this is a fingerprinting param to strip (excluding those we normalize)
    // Handle bracket notation (e.g., ud[em] matches ud) and dot notation
    const matchesParam = (k: string, params: string[]) => {
      const lk = k.toLowerCase()
      return params.some((p) => {
        const lp = p.toLowerCase()
        if (lk === lp) return true
        if (lk.startsWith(lp + '[')) return true
        return false
      })
    }

    const isIpParam = matchesParam(key, STRIP_PARAMS.ip)
    const isUserIdParam = matchesParam(key, STRIP_PARAMS.userId)
    const isUserDataParam = matchesParam(key, STRIP_PARAMS.userData)
    const isScreenParam = STRIP_PARAMS.screen.some(p => lowerKey === p.toLowerCase() || lowerKey.includes(p.toLowerCase()))
    const isPlatformParam = matchesParam(key, STRIP_PARAMS.platform)
    const isCanvasParam = matchesParam(key, STRIP_PARAMS.canvas)
    // Browser params that aren't UA (plugins, fonts) - UA is handled above
    const isBrowserParam = ['plugins', 'fonts'].some(p => lowerKey === p.toLowerCase())
    const isLocationParam = matchesParam(key, STRIP_PARAMS.location)
    const isDeviceInfoParam = matchesParam(key, STRIP_PARAMS.deviceInfo)

    const shouldStrip = isIpParam || isUserIdParam || isUserDataParam || isScreenParam
      || isPlatformParam || isCanvasParam || isBrowserParam || isLocationParam || isDeviceInfoParam

    if (mode === 'strict') {
      if (shouldStrip) {
        // Skip entirely in strict mode
        continue
      }
    }
    else if (mode === 'anonymize') {
      // In anonymize mode, some params get transformed instead of stripped
      if (isIpParam && typeof value === 'string') {
        result[key] = anonymizeIP(value)
        continue
      }
      if (isScreenParam) {
        result[key] = generalizeScreen(value)
        continue
      }
      // Always strip these even in anonymize mode
      if (isUserIdParam || isUserDataParam || isCanvasParam || isPlatformParam || isBrowserParam || isLocationParam || isDeviceInfoParam) {
        continue
      }
    }

    // Recursively process nested objects
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = stripFingerprintingFromPayload(value as Record<string, unknown>, mode)
    }
    else {
      result[key] = value
    }
  }

  return result
}
