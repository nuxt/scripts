/**
 * Granular privacy controls for the first-party proxy.
 * Each flag controls both headers AND body/query params for its domain.
 */
export interface ProxyPrivacy {
  /** Anonymize IP (headers + body). When false, real IP is forwarded via x-forwarded-for. */
  ip?: boolean
  /** Normalize User-Agent (headers + body) */
  userAgent?: boolean
  /** Normalize Accept-Language (headers + body) */
  language?: boolean
  /** Generalize screen resolution, viewport, hardware concurrency, device memory */
  screen?: boolean
  /** Generalize timezone offset and IANA timezone names */
  timezone?: boolean
  /** Anonymize hardware fingerprints: canvas/webgl/audio, plugins/fonts, browser versions, device info */
  hardware?: boolean
}

/**
 * Privacy input: `true` = full anonymize, `false` = passthrough (still strips sensitive headers),
 * or a `ProxyPrivacy` object for granular control (unset flags default to `false` — opt-in).
 */
export type ProxyPrivacyInput = boolean | ProxyPrivacy

/** Resolved privacy with all flags explicitly set. */
export type ResolvedProxyPrivacy = Required<ProxyPrivacy>

/**
 * Normalize a privacy input to a fully-resolved object.
 * Privacy is opt-in: unset object flags default to `false`.
 * Each script in the registry explicitly sets all flags for its needs.
 * - `true` → all flags true (full anonymize)
 * - `false` / `undefined` → all flags false (passthrough)
 * - `{ ip: true, hardware: true }` → only those active, rest off
 */
export function resolvePrivacy(input?: ProxyPrivacyInput): ResolvedProxyPrivacy {
  if (input === true) return { ip: true, userAgent: true, language: true, screen: true, timezone: true, hardware: true }
  if (input === false || input === undefined || input === null) return { ip: false, userAgent: false, language: false, screen: false, timezone: false, hardware: false }
  return {
    ip: input.ip ?? false,
    userAgent: input.userAgent ?? false,
    language: input.language ?? false,
    screen: input.screen ?? false,
    timezone: input.timezone ?? false,
    hardware: input.hardware ?? false,
  }
}

/**
 * Merge privacy settings: `override` fields take precedence over `base` field-by-field.
 * When `override` is undefined, returns `base` unchanged.
 * When `override` is a boolean, it fully replaces `base`.
 * When `override` is an object, only explicitly-set fields override.
 */
export function mergePrivacy(base: ResolvedProxyPrivacy, override?: ProxyPrivacyInput): ResolvedProxyPrivacy {
  if (override === undefined || override === null) return base
  // Boolean fully replaces
  if (typeof override === 'boolean') return resolvePrivacy(override)
  // Object: only override fields that were explicitly set
  return {
    ip: override.ip !== undefined ? override.ip : base.ip,
    userAgent: override.userAgent !== undefined ? override.userAgent : base.userAgent,
    language: override.language !== undefined ? override.language : base.language,
    screen: override.screen !== undefined ? override.screen : base.screen,
    timezone: override.timezone !== undefined ? override.timezone : base.timezone,
    hardware: override.hardware !== undefined ? override.hardware : base.hardware,
  }
}

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
 * Normalize Accept-Language to primary language tag (preserving country).
 * "en-US,en;q=0.9,fr;q=0.8" → "en-US"
 */
export function normalizeLanguage(lang: string): string {
  return lang.split(',')[0]?.split(';')[0]?.trim() || 'en'
}

/**
 * Device-class screen resolution buckets.
 * Each class maps to a real-world resolution to blend with genuine traffic.
 */
const SCREEN_BUCKETS = {
  desktop: { w: 1920, h: 1080 },
  tablet: { w: 768, h: 1024 },
  mobile: { w: 360, h: 640 },
} as const

type DeviceClass = keyof typeof SCREEN_BUCKETS

function getDeviceClass(width: number): DeviceClass {
  if (width >= 1200) return 'desktop'
  if (width >= 700) return 'tablet'
  return 'mobile'
}

/**
 * Generalize screen resolution to 3 coarse device-class buckets (mobile / tablet / desktop).
 * Handles both combined "WxH" strings and individual dimension values (sh, sw).
 *
 * When `dimension` is specified, uses the correct bucket for that axis:
 *   - 'width': [1920, 768, 360]
 *   - 'height': [1080, 1024, 640]
 * Without `dimension`, individual values use width thresholds (backward-compatible).
 */
export function generalizeScreen(value: unknown, dimension?: 'width' | 'height'): string | number {
  // Combined resolution format (e.g., "1920x1080")
  if (typeof value === 'string' && value.includes('x')) {
    const width = Number.parseInt(value.split('x')[0] || '0')
    const cls = getDeviceClass(width)
    return `${SCREEN_BUCKETS[cls].w}x${SCREEN_BUCKETS[cls].h}`
  }
  // Individual dimension (sh, sw as number or numeric string)
  const num = typeof value === 'number' ? value : Number(value)
  if (!Number.isNaN(num)) {
    const cls = getDeviceClass(num)
    const bucketed = dimension === 'height' ? SCREEN_BUCKETS[cls].h : SCREEN_BUCKETS[cls].w
    return typeof value === 'number' ? bucketed : String(bucketed)
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
 * Generalize a version string to major version, preserving the original format.
 * "6.17.0" → "6.0.0", "143.0.7499.4" → "143.0.0.0"
 */
export function generalizeVersion(value: unknown): string {
  if (typeof value !== 'string') return String(value)
  const match = value.match(/^(\d+)(([.\-_])\d+)*/)
  if (!match) return String(value)
  const major = match[1]
  const sep = match[3] || '.'
  const segmentCount = value.split(/[.\-_]/).length
  return major + (sep + '0').repeat(segmentCount - 1)
}

/**
 * Generalize browser version list to major versions, preserving segment count.
 * Handles Snapchat d_bvs format: [,{"brand":"Chrome","version":"143.0.7499.4"}...]
 * Handles GA uafvl format: HeadlessChrome;143.0.7499.4|Chromium;143.0.7499.4|...
 */
export function generalizeBrowserVersions(value: unknown): string {
  if (typeof value !== 'string') return String(value)
  const zeroSegments = (ver: string) => {
    const parts = ver.split('.')
    return parts[0] + parts.slice(1).map(() => '.0').join('')
  }
  // Snapchat d_bvs: JSON with version fields
  if (value.includes('"version"'))
    return value.replace(/("version"\s*:\s*")(\d+(?:\.\d+)*)/g, (_, prefix, ver) => prefix + zeroSegments(ver))
  // GA uafvl: semicolon-separated brand;version pairs, pipe-delimited
  if (value.includes(';'))
    return value.replace(/;(\d+(?:\.\d+)*)/g, (_, ver) => ';' + zeroSegments(ver))
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
 * Anonymize a combined device-info string (e.g. X/Twitter `dv` param).
 * Parses the delimited string and generalizes fingerprinting components
 * (timezone, language, screen dimensions) while keeping low-entropy values.
 */
export function anonymizeDeviceInfo(value: string): string {
  const sep = value.includes('|') ? '|' : '&'
  const parts = value.split(sep)
  if (parts.length < 4) return value

  const result = [...parts]
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!
    // IANA timezone (contains /)
    if (part.includes('/') && /^[A-Z]/.test(part)) {
      result[i] = String(generalizeTimezone(part))
      continue
    }
    // Language code
    if (/^[a-z]{2}(?:-[a-z]{2,})?$/i.test(part)) {
      result[i] = normalizeLanguage(part)
      continue
    }
    // Screen-like dimension pair (consecutive numbers 300–10000 = width, height)
    const num = Number(part)
    if (!Number.isNaN(num) && num >= 300 && num <= 10000) {
      const nextNum = Number(parts[i + 1])
      if (!Number.isNaN(nextNum) && nextNum >= 300 && nextNum <= 10000) {
        // Pair: determine device class from width, apply both
        const cls = getDeviceClass(num)
        result[i] = String(SCREEN_BUCKETS[cls].w)
        result[i + 1] = String(SCREEN_BUCKETS[cls].h)
        i++ // skip next (already handled as height)
        continue
      }
      // Standalone screen-like number
      result[i] = String(generalizeScreen(num))
      continue
    }
    // Timezone offset (negative number)
    if (!Number.isNaN(num) && num < -60) {
      result[i] = String(generalizeTimezone(num))
    }
    // Everything else (vendor, platform, color depth, flags): keep as-is
  }
  return result.join(sep)
}

/**
 * Recursively anonymize fingerprinting data in payload.
 * Fields are generalized or normalized rather than stripped, so endpoints
 * still receive valid data with reduced fingerprinting precision.
 *
 * When `privacy` is provided, only categories with their flag set to `true` are processed.
 * Default (no arg) = all categories active, so existing callers work unchanged.
 */
export function stripPayloadFingerprinting(
  payload: Record<string, unknown>,
  privacy?: ResolvedProxyPrivacy,
): Record<string, unknown> {
  const p = privacy || { ip: true, userAgent: true, language: true, screen: true, timezone: true, hardware: true }
  const result: Record<string, unknown> = {}

  // Pre-scan for screen width to enable paired height bucketing.
  // When sw is present, sh maps to the paired height for that device class
  // (e.g., sw=1280 → desktop → sh becomes 1080, not independently bucketed).
  let deviceClass: DeviceClass | undefined
  for (const [key, value] of Object.entries(payload)) {
    if (key.toLowerCase() === 'sw') {
      const num = typeof value === 'number' ? value : Number(value)
      if (!Number.isNaN(num)) deviceClass = getDeviceClass(num)
    }
  }

  for (const [key, value] of Object.entries(payload)) {
    const lowerKey = key.toLowerCase()

    const matchesParam = (key: string, params: string[]) => {
      const lk = key.toLowerCase()
      return params.some((pm) => {
        const lp = pm.toLowerCase()
        return lk === lp || lk.startsWith(lp + '[')
      })
    }

    // Language params — controlled by language flag
    const isLanguageParam = NORMALIZE_PARAMS.language.some(pm => lowerKey === pm.toLowerCase())
    if (isLanguageParam && typeof value === 'string') {
      result[key] = p.language ? normalizeLanguage(value) : value
      continue
    }

    // User-agent params — controlled by userAgent flag
    const isUserAgentParam = NORMALIZE_PARAMS.userAgent.some(pm => lowerKey === pm.toLowerCase())
    if (isUserAgentParam && typeof value === 'string') {
      result[key] = p.userAgent ? normalizeUserAgent(value) : value
      continue
    }

    // Anonymize IP to subnet — controlled by ip flag
    if (matchesParam(key, STRIP_PARAMS.ip) && typeof value === 'string') {
      result[key] = p.ip ? anonymizeIP(value) : value
      continue
    }

    // Generalize screen to common bucket (with paired width/height awareness) — screen flag
    if (matchesParam(key, STRIP_PARAMS.screen)) {
      if (!p.screen) {
        result[key] = value
        continue
      }
      // Color depth and pixel ratio are low-entropy (2-4 distinct values) — keep as-is
      if (['sd', 'colordepth', 'pixelratio'].includes(lowerKey)) {
        result[key] = value
      }
      else if (lowerKey === 'sh' && deviceClass) {
        // Paired: use height from the device class determined by sw
        const paired = SCREEN_BUCKETS[deviceClass].h
        result[key] = typeof value === 'number' ? paired : String(paired)
      }
      else {
        result[key] = generalizeScreen(value, lowerKey === 'sw' ? 'width' : lowerKey === 'sh' ? 'height' : undefined)
      }
      continue
    }
    // Generalize hardware to common bucket — screen flag (device capabilities)
    if (matchesParam(key, STRIP_PARAMS.hardware)) {
      result[key] = p.screen ? generalizeHardware(value) : value
      continue
    }
    // Generalize version strings to major version — hardware flag
    if (matchesParam(key, STRIP_PARAMS.version)) {
      result[key] = p.hardware ? generalizeVersion(value) : value
      continue
    }
    // Generalize browser version lists to major versions — hardware flag
    if (matchesParam(key, STRIP_PARAMS.browserVersion)) {
      result[key] = p.hardware ? generalizeBrowserVersions(value) : value
      continue
    }
    // Generalize timezone — timezone flag
    if (matchesParam(key, STRIP_PARAMS.location)) {
      result[key] = p.timezone ? generalizeTimezone(value) : value
      continue
    }
    // Replace browser data lists with empty value — hardware flag
    if (matchesParam(key, STRIP_PARAMS.browserData)) {
      result[key] = p.hardware ? (Array.isArray(value) ? [] : '') : value
      continue
    }
    // Replace canvas/webgl/audio fingerprints with empty value — hardware flag
    if (matchesParam(key, STRIP_PARAMS.canvas)) {
      result[key] = p.hardware ? (typeof value === 'number' ? 0 : typeof value === 'object' ? {} : '') : value
      continue
    }
    // Anonymize combined device info (parse and generalize components) — hardware flag
    if (matchesParam(key, STRIP_PARAMS.deviceInfo)) {
      result[key] = p.hardware ? (typeof value === 'string' ? anonymizeDeviceInfo(value) : '') : value
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
          ? stripPayloadFingerprinting(item as Record<string, unknown>, privacy)
          : item,
      )
    }
    else if (typeof value === 'object' && value !== null) {
      result[key] = stripPayloadFingerprinting(value as Record<string, unknown>, privacy)
    }
    else {
      result[key] = value
    }
  }

  return result
}
