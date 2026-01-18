import { describe, it, expect } from 'vitest'

/**
 * Test fingerprinting data that analytics scripts commonly collect and send.
 * This helps identify what we need to strip/anonymize in the proxy handler.
 */

// Common fingerprinting data collected by analytics
const FINGERPRINT_PAYLOAD = {
  // Google Analytics Measurement Protocol parameters
  ga: {
    cid: '1234567890.1234567890', // Client ID - persistent identifier
    uid: 'user-123', // User ID
    uip: '192.168.1.100', // User IP override
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0', // User Agent
    ul: 'en-US', // User Language
    sr: '2560x1440', // Screen Resolution
    vp: '1920x1080', // Viewport Size
    sd: '24-bit', // Screen Color Depth
    je: '0', // Java Enabled
    fl: '', // Flash Version (legacy)
    de: 'UTF-8', // Document Encoding
    dt: 'Page Title', // Document Title
    dl: 'https://example.com/page', // Document Location
    dr: 'https://google.com', // Document Referrer
    z: '1234567890', // Cache Buster
    _gid: 'GA1.2.1234567890.1234567890', // Session ID
  },

  // Meta Pixel / Facebook parameters
  meta: {
    ud: {
      em: 'a1b2c3d4e5f6', // Hashed email
      ph: 'f6e5d4c3b2a1', // Hashed phone
      fn: 'abc123', // Hashed first name
      ln: 'def456', // Hashed last name
      ct: 'city', // City
      st: 'state', // State
      zp: '12345', // Zip
      country: 'us',
    },
    external_id: 'ext-user-123', // Cross-site identifier (top-level)
    fbp: '_fbp=fb.1.1234567890.1234567890', // Facebook Browser ID
    fbc: '_fbc=fb.1.1234567890.AbCdEfGh', // Facebook Click ID
    client_user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0',
    client_ip_address: '192.168.1.100',
  },

  // Clarity / Session Recording
  clarity: {
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0',
    sr: '2560x1440',
    tz: 'America/New_York',
    lang: 'en-US',
    plat: 'MacIntel',
    mem: 8, // Device memory in GB
    cpu: 8, // Hardware concurrency
    touch: 0, // Touch support
    cookie: 1, // Cookies enabled
  },

  // X/Twitter Pixel - dv param contains concatenated fingerprinting data
  xPixel: {
    bci: '4', // Browser context indicator
    dv: 'Australia/Melbourne&en-GB&Google Inc.&Linux x86_64&255&1280&720&24&24&1280&720&0&na', // Combined device fingerprint
    eci: '3', // Environment context indicator
    event: '{}',
    event_id: 'a944216c-54e2-4dbb-a338-144f32888929',
    integration: 'advertiser',
    p_id: 'Twitter',
    p_user_id: '0', // User ID
    pl_id: '35809bf2-ef6f-4b4f-9afc-4ffceb3b7e4c', // Pixel/placement ID - tracking
    pt: 'Test Page',
    tw_document_href: 'http://127.0.0.1:3000/test',
    tw_iframe_status: '0',
    txn_id: 'ol7lz',
    type: 'javascript',
    version: '2.3.35',
  },

  // Generic fingerprinting vectors
  fingerprint: {
    // Hardware
    screen: { width: 2560, height: 1440, colorDepth: 24, pixelRatio: 2 },
    viewport: { width: 1920, height: 1080 },
    hardwareConcurrency: 8,
    deviceMemory: 8,
    maxTouchPoints: 0,
    platform: 'MacIntel',

    // Software
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    language: 'en-US',
    languages: ['en-US', 'en', 'fr'],
    timezone: 'America/New_York',
    timezoneOffset: 300,

    // Browser features
    cookieEnabled: true,
    doNotTrack: null,
    plugins: ['PDF Viewer', 'Chrome PDF Viewer', 'Chromium PDF Viewer'],

    // Canvas fingerprint
    canvas: 'a1b2c3d4e5f6g7h8i9j0',
    webgl: {
      vendor: 'Google Inc. (Apple)',
      renderer: 'ANGLE (Apple, Apple M1 Pro, OpenGL 4.1)',
    },

    // Audio fingerprint
    audioFingerprint: 124.04347527516074,

    // Font detection
    fonts: ['Arial', 'Helvetica', 'Times New Roman', 'Georgia'],

    // Connection info
    connection: {
      effectiveType: '4g',
      downlink: 10,
      rtt: 50,
    },
  },
}

// Parameters that should be stripped or anonymized
const STRIP_PARAMS = {
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
const NORMALIZE_PARAMS = {
  // Language - keep primary only
  language: ['ul', 'lang', 'language', 'languages'],

  // User agent - keep browser family only
  userAgent: ['ua', 'userAgent', 'user_agent', 'client_user_agent', 'context.userAgent'],
}

// Parameters that are OK to forward
const ALLOWED_PARAMS = {
  // Page context (needed for analytics)
  page: ['dt', 'dl', 'dr', 'de'], // title, location, referrer, encoding

  // Event data
  event: ['en', 'ep', 'ev', 'ec', 'ea', 'el'], // event name, params, value, category, action, label

  // Timestamps
  time: ['z', '_s', 'timestamp'],
}

describe('proxy privacy - payload analysis', () => {
  describe('GA payload', () => {
    it('identifies fingerprinting params in GA payload', () => {
      const gaPayload = FINGERPRINT_PAYLOAD.ga
      const fingerprintParams = Object.keys(gaPayload).filter((key) => {
        return STRIP_PARAMS.ip.includes(key)
          || STRIP_PARAMS.userId.includes(key)
          || STRIP_PARAMS.screen.includes(key)
          || STRIP_PARAMS.browser.includes(key)
      })

      console.log('GA fingerprinting params found:', fingerprintParams)
      expect(fingerprintParams).toContain('uip') // IP
      expect(fingerprintParams).toContain('cid') // Client ID
      expect(fingerprintParams).toContain('uid') // User ID
      expect(fingerprintParams).toContain('sr') // Screen resolution
      expect(fingerprintParams).toContain('vp') // Viewport
      expect(fingerprintParams).toContain('ua') // User agent
    })

    it('identifies params to normalize in GA payload', () => {
      const gaPayload = FINGERPRINT_PAYLOAD.ga
      const normalizeParams = Object.keys(gaPayload).filter((key) => {
        return NORMALIZE_PARAMS.language.includes(key)
      })

      console.log('GA params to normalize:', normalizeParams)
      expect(normalizeParams).toContain('ul') // Language
    })

    it('identifies safe params in GA payload', () => {
      const gaPayload = FINGERPRINT_PAYLOAD.ga
      const safeParams = Object.keys(gaPayload).filter((key) => {
        return ALLOWED_PARAMS.page.includes(key)
          || ALLOWED_PARAMS.event.includes(key)
          || ALLOWED_PARAMS.time.includes(key)
      })

      console.log('GA safe params:', safeParams)
      expect(safeParams).toContain('dt') // Title
      expect(safeParams).toContain('dl') // Location
      expect(safeParams).toContain('dr') // Referrer
      expect(safeParams).toContain('z') // Cache buster
    })
  })

  describe('Meta pixel payload', () => {
    it('identifies fingerprinting params in Meta payload', () => {
      const metaPayload = FINGERPRINT_PAYLOAD.meta
      const fingerprintParams: string[] = []

      for (const key of Object.keys(metaPayload)) {
        if (STRIP_PARAMS.ip.some(p => key.toLowerCase().includes(p.toLowerCase()))) fingerprintParams.push(key)
        if (STRIP_PARAMS.userId.some(p => key.toLowerCase() === p.toLowerCase())) fingerprintParams.push(key)
        if (STRIP_PARAMS.userData.some(p => key.toLowerCase() === p.toLowerCase())) fingerprintParams.push(key)
        if (STRIP_PARAMS.browser.some(p => key.toLowerCase().includes(p.toLowerCase()))) fingerprintParams.push(key)
      }

      console.log('Meta fingerprinting params found:', fingerprintParams)
      expect(fingerprintParams).toContain('client_ip_address')
      expect(fingerprintParams).toContain('external_id')
      expect(fingerprintParams).toContain('ud') // User data
      expect(fingerprintParams).toContain('fbp') // Browser ID
      expect(fingerprintParams).toContain('fbc') // Click ID
    })
  })

  describe('X/Twitter pixel payload', () => {
    it('identifies fingerprinting params in X pixel payload', () => {
      const xPayload = FINGERPRINT_PAYLOAD.xPixel
      const fingerprintParams: string[] = []

      for (const key of Object.keys(xPayload)) {
        const lowerKey = key.toLowerCase()
        if (STRIP_PARAMS.deviceInfo.some(p => lowerKey === p.toLowerCase())) fingerprintParams.push(key)
        if (STRIP_PARAMS.userId.some(p => lowerKey === p.toLowerCase())) fingerprintParams.push(key)
      }

      console.log('X/Twitter fingerprinting params found:', fingerprintParams)
      expect(fingerprintParams).toContain('dv') // Device info - contains timezone, screen, platform etc.
      expect(fingerprintParams).toContain('bci') // Browser context indicator
      expect(fingerprintParams).toContain('eci') // Environment context indicator
      expect(fingerprintParams).toContain('pl_id') // Pixel/placement ID
      expect(fingerprintParams).toContain('p_user_id') // User ID
    })
  })

  describe('generic fingerprint payload', () => {
    it('identifies all fingerprinting vectors', () => {
      const fp = FINGERPRINT_PAYLOAD.fingerprint
      const vectors: string[] = []

      // Check each category
      if (fp.screen) vectors.push('screen')
      if (fp.viewport) vectors.push('viewport')
      if (fp.hardwareConcurrency) vectors.push('hardwareConcurrency')
      if (fp.deviceMemory) vectors.push('deviceMemory')
      if (fp.platform) vectors.push('platform')
      if (fp.userAgent) vectors.push('userAgent')
      if (fp.languages) vectors.push('languages')
      if (fp.timezone) vectors.push('timezone')
      if (fp.plugins) vectors.push('plugins')
      if (fp.canvas) vectors.push('canvas')
      if (fp.webgl) vectors.push('webgl')
      if (fp.audioFingerprint) vectors.push('audioFingerprint')
      if (fp.fonts) vectors.push('fonts')
      if (fp.connection) vectors.push('connection')

      console.log('All fingerprinting vectors:', vectors)
      expect(vectors.length).toBeGreaterThan(10)
    })
  })
})

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

function anonymizeIP(ip: string): string {
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

function normalizeLanguage(lang: string): string {
  const primary = lang.split(',')[0]?.split('-')[0]?.split(';')[0]?.trim()
  return primary || 'en'
}

function normalizeUserAgent(ua: string): string {
  if (ua.includes('Firefox/')) return 'Mozilla/5.0 (compatible; Firefox)'
  if (ua.includes('Edg/')) return 'Mozilla/5.0 (compatible; Edge)'
  if (ua.includes('OPR/') || ua.includes('Opera/')) return 'Mozilla/5.0 (compatible; Opera)'
  if (ua.includes('Safari/') && !ua.includes('Chrome/')) return 'Mozilla/5.0 (compatible; Safari)'
  if (ua.includes('Chrome/')) return 'Mozilla/5.0 (compatible; Chrome)'
  return 'Mozilla/5.0 (compatible)'
}

function generalizeScreen(value: unknown): string {
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

describe('stripFingerprintingFromPayload', () => {
  describe('strict mode', () => {
    it('strips all fingerprinting from GA payload', () => {
      const result = stripFingerprintingFromPayload(FINGERPRINT_PAYLOAD.ga, 'strict')

      // Should NOT have these
      expect(result.uip).toBeUndefined() // IP
      expect(result.cid).toBeUndefined() // Client ID
      expect(result.uid).toBeUndefined() // User ID
      expect(result.sr).toBeUndefined() // Screen
      expect(result.vp).toBeUndefined() // Viewport
      expect(result.sd).toBeUndefined() // Color depth
      expect(result._gid).toBeUndefined() // Session ID

      // Should have normalized these
      expect(result.ul).toBe('en') // Language normalized
      expect(result.ua).toBe('Mozilla/5.0 (compatible; Chrome)') // UA normalized

      // Should keep these
      expect(result.dt).toBe('Page Title')
      expect(result.dl).toBe('https://example.com/page')
      expect(result.dr).toBe('https://google.com')
      expect(result.z).toBe('1234567890')
    })

    it('strips all fingerprinting from Meta payload', () => {
      const result = stripFingerprintingFromPayload(FINGERPRINT_PAYLOAD.meta, 'strict')

      expect(result.ud).toBeUndefined() // User data
      expect(result.fbp).toBeUndefined() // Browser ID
      expect(result.fbc).toBeUndefined() // Click ID
      expect(result.external_id).toBeUndefined() // External ID
      expect(result.client_ip_address).toBeUndefined() // IP
      expect(result.client_user_agent).toBe('Mozilla/5.0 (compatible; Chrome)') // Normalized
    })

    it('strips fingerprinting from X/Twitter pixel payload', () => {
      const result = stripFingerprintingFromPayload(FINGERPRINT_PAYLOAD.xPixel, 'strict')

      // Should NOT have these fingerprinting params
      expect(result.dv).toBeUndefined() // Combined device info
      expect(result.bci).toBeUndefined() // Browser context
      expect(result.eci).toBeUndefined() // Environment context
      expect(result.pl_id).toBeUndefined() // Pixel/placement ID
      expect(result.p_user_id).toBeUndefined() // User ID

      // Should keep non-fingerprinting params
      expect(result.event).toBe('{}')
      expect(result.event_id).toBe('a944216c-54e2-4dbb-a338-144f32888929')
      expect(result.pt).toBe('Test Page')
      expect(result.txn_id).toBe('ol7lz')
      expect(result.type).toBe('javascript')
    })

    it('strips all vectors from fingerprint payload', () => {
      const result = stripFingerprintingFromPayload(FINGERPRINT_PAYLOAD.fingerprint, 'strict')

      expect(result.screen).toBeUndefined()
      expect(result.viewport).toBeUndefined()
      expect(result.hardwareConcurrency).toBeUndefined()
      expect(result.deviceMemory).toBeUndefined()
      expect(result.platform).toBeUndefined()
      expect(result.plugins).toBeUndefined()
      expect(result.canvas).toBeUndefined()
      expect(result.webgl).toBeUndefined()
      expect(result.audioFingerprint).toBeUndefined()
      expect(result.fonts).toBeUndefined()

      // Normalized
      expect(result.userAgent).toBe('Mozilla/5.0 (compatible; Chrome)')
      expect(result.language).toBe('en')
    })
  })

  describe('anonymize mode', () => {
    it('anonymizes GA payload while preserving analytics value', () => {
      const result = stripFingerprintingFromPayload(FINGERPRINT_PAYLOAD.ga, 'anonymize')

      // IP anonymized to country level
      expect(result.uip).toBe('192.168.1.0')

      // Identifiers still stripped
      expect(result.cid).toBeUndefined()
      expect(result.uid).toBeUndefined()
      expect(result._gid).toBeUndefined()

      // Screen generalized
      expect(result.sr).toBe('2560x1440')
      expect(result.vp).toBe('1920x1080')

      // Language/UA normalized
      expect(result.ul).toBe('en')
      expect(result.ua).toBe('Mozilla/5.0 (compatible; Chrome)')

      // Page context preserved
      expect(result.dt).toBe('Page Title')
      expect(result.dl).toBe('https://example.com/page')
    })

    it('anonymizes Meta payload while preserving event tracking', () => {
      const result = stripFingerprintingFromPayload(FINGERPRINT_PAYLOAD.meta, 'anonymize')

      // User data and identifiers stripped
      expect(result.ud).toBeUndefined()
      expect(result.fbp).toBeUndefined()
      expect(result.fbc).toBeUndefined()
      expect(result.external_id).toBeUndefined()

      // IP anonymized
      expect(result.client_ip_address).toBe('192.168.1.0')

      // UA normalized
      expect(result.client_user_agent).toBe('Mozilla/5.0 (compatible; Chrome)')
    })
  })
})
