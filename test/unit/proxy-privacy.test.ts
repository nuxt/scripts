import { describe, it, expect } from 'vitest'
import {
  STRIP_PARAMS,
  NORMALIZE_PARAMS,
  ALLOWED_PARAMS,
  stripFingerprintingFromPayload,
} from '../utils/proxy-privacy'
import { resolvePrivacy, mergePrivacy, stripPayloadFingerprinting } from '../../src/runtime/server/utils/privacy'
import type { ResolvedProxyPrivacy } from '../../src/runtime/server/utils/privacy'

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
    dv: 'Australia/Melbourne&en-GB&Google Inc.&Linux x86_64&255&1280&720&24&24&1280&720&0&na', // Combined device hardware
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
  hardware: {
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

    // Canvas hardware
    canvas: 'a1b2c3d4e5f6g7h8i9j0',
    webgl: {
      vendor: 'Google Inc. (Apple)',
      renderer: 'ANGLE (Apple, Apple M1 Pro, OpenGL 4.1)',
    },

    // Audio hardware
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

describe('proxy privacy - payload analysis', () => {
  describe('GA payload', () => {
    it('identifies fingerprinting params in GA payload', () => {
      const gaPayload = FINGERPRINT_PAYLOAD.ga
      const hardwareParams = Object.keys(gaPayload).filter((key) => {
        return STRIP_PARAMS.ip.includes(key)
          || STRIP_PARAMS.userId.includes(key)
          || STRIP_PARAMS.screen.includes(key)
          || STRIP_PARAMS.browserData.includes(key)
          || STRIP_PARAMS.browserVersion.includes(key)
      })
      const normalizedParams = Object.keys(gaPayload).filter((key) => {
        return NORMALIZE_PARAMS.language.includes(key)
          || NORMALIZE_PARAMS.userAgent.includes(key)
      })

      console.warn('GA fingerprinting params found:', hardwareParams)
      console.warn('GA normalized params:', normalizedParams)
      expect(hardwareParams).toContain('uip') // IP
      expect(hardwareParams).toContain('cid') // Client ID
      expect(hardwareParams).toContain('uid') // User ID
      expect(hardwareParams).toContain('sr') // Screen resolution
      expect(hardwareParams).toContain('vp') // Viewport
      expect(normalizedParams).toContain('ua') // User agent (normalized, not stripped)
    })

    it('identifies params to normalize in GA payload', () => {
      const gaPayload = FINGERPRINT_PAYLOAD.ga
      const normalizeParams = Object.keys(gaPayload).filter((key) => {
        return NORMALIZE_PARAMS.language.includes(key)
      })

      console.warn('GA params to normalize:', normalizeParams)
      expect(normalizeParams).toContain('ul') // Language
    })

    it('identifies safe params in GA payload', () => {
      const gaPayload = FINGERPRINT_PAYLOAD.ga
      const safeParams = Object.keys(gaPayload).filter((key) => {
        return ALLOWED_PARAMS.page.includes(key)
          || ALLOWED_PARAMS.event.includes(key)
          || ALLOWED_PARAMS.time.includes(key)
      })

      console.warn('GA safe params:', safeParams)
      expect(safeParams).toContain('dt') // Title
      expect(safeParams).toContain('dl') // Location
      expect(safeParams).toContain('dr') // Referrer
      expect(safeParams).toContain('z') // Cache buster
    })
  })

  describe('Meta pixel payload', () => {
    it('identifies fingerprinting params in Meta payload', () => {
      const metaPayload = FINGERPRINT_PAYLOAD.meta
      const hardwareParams: string[] = []

      for (const key of Object.keys(metaPayload)) {
        if (STRIP_PARAMS.ip.some(p => key.toLowerCase().includes(p.toLowerCase()))) hardwareParams.push(key)
        if (STRIP_PARAMS.userId.some(p => key.toLowerCase() === p.toLowerCase())) hardwareParams.push(key)
        if (STRIP_PARAMS.userData.some(p => key.toLowerCase() === p.toLowerCase())) hardwareParams.push(key)
        if (STRIP_PARAMS.browserData.some(p => key.toLowerCase().includes(p.toLowerCase()))) hardwareParams.push(key)
        if (STRIP_PARAMS.browserVersion.some(p => key.toLowerCase().includes(p.toLowerCase()))) hardwareParams.push(key)
      }

      console.warn('Meta fingerprinting params found:', hardwareParams)
      expect(hardwareParams).toContain('client_ip_address')
      expect(hardwareParams).toContain('external_id')
      expect(hardwareParams).toContain('ud') // User data
      expect(hardwareParams).toContain('fbp') // Browser ID
      expect(hardwareParams).toContain('fbc') // Click ID
    })
  })

  describe('X/Twitter pixel payload', () => {
    it('identifies fingerprinting params in X pixel payload', () => {
      const xPayload = FINGERPRINT_PAYLOAD.xPixel
      const hardwareParams: string[] = []

      for (const key of Object.keys(xPayload)) {
        const lowerKey = key.toLowerCase()
        if (STRIP_PARAMS.deviceInfo.some(p => lowerKey === p.toLowerCase())) hardwareParams.push(key)
        if (STRIP_PARAMS.userId.some(p => lowerKey === p.toLowerCase())) hardwareParams.push(key)
      }

      console.warn('X/Twitter fingerprinting params found:', hardwareParams)
      expect(hardwareParams).toContain('dv') // Device info - contains timezone, screen, platform etc.
      // bci/eci are batch/event counters, not fingerprinting — no longer in deviceInfo
      expect(hardwareParams).toContain('pl_id') // Pixel/placement ID
      expect(hardwareParams).toContain('p_user_id') // User ID
    })
  })

  describe('generic hardware payload', () => {
    it('identifies all fingerprinting vectors', () => {
      const fp = FINGERPRINT_PAYLOAD.hardware
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

      console.warn('All fingerprinting vectors:', vectors)
      expect(vectors.length).toBeGreaterThan(10)
    })
  })
})

describe('stripFingerprintingFromPayload', () => {
  describe('anonymize mode', () => {
    it('anonymizes GA payload while preserving analytics value', () => {
      const result = stripFingerprintingFromPayload(FINGERPRINT_PAYLOAD.ga)

      // IP anonymized to country level
      expect(result.uip).toBe('192.168.1.0')

      // User IDs preserved for analytics
      expect(result.cid).toBe('1234567890.1234567890')
      expect(result.uid).toBe('user-123')
      expect(result._gid).toBe('GA1.2.1234567890.1234567890')

      // Screen generalized to device-class buckets
      expect(result.sr).toBe('1920x1080')
      expect(result.vp).toBe('1920x1080')

      // Language/UA normalized
      expect(result.ul).toBe('en-US')
      expect(result.ua).toBe('Mozilla/5.0 (compatible; Chrome/120.0)')

      // Page context preserved
      expect(result.dt).toBe('Page Title')
      expect(result.dl).toBe('https://example.com/page')
    })

    it('anonymizes Meta payload while preserving event tracking', () => {
      const result = stripFingerprintingFromPayload(FINGERPRINT_PAYLOAD.meta)

      // User data preserved
      expect(result.ud).toBeDefined()

      // User IDs preserved for analytics
      expect(result.fbp).toBe('_fbp=fb.1.1234567890.1234567890')
      expect(result.fbc).toBe('_fbc=fb.1.1234567890.AbCdEfGh')
      expect(result.external_id).toBe('ext-user-123')

      // IP anonymized
      expect(result.client_ip_address).toBe('192.168.1.0')

      // UA normalized
      expect(result.client_user_agent).toBe('Mozilla/5.0 (compatible; Chrome/120.0)')
    })

    it('anonymizes fingerprinting from X/Twitter pixel payload', () => {
      const result = stripFingerprintingFromPayload(FINGERPRINT_PAYLOAD.xPixel)

      // Combined device info anonymized (timezone, language, screen dims generalized)
      // Screen pairs: 1280x720 → desktop class → 1920x1080 (paired bucketing)
      expect(result.dv).toBe('UTC&en-GB&Google Inc.&Linux x86_64&255&1920&1080&24&24&1920&1080&0&na')

      // bci/eci are not fingerprinting — preserved as-is
      expect(result.bci).toBe('4')
      expect(result.eci).toBe('3')

      // User IDs preserved for analytics
      expect(result.pl_id).toBe('35809bf2-ef6f-4b4f-9afc-4ffceb3b7e4c')
      expect(result.p_user_id).toBe('0')

      // Should keep non-fingerprinting params
      expect(result.event).toBe('{}')
      expect(result.event_id).toBe('a944216c-54e2-4dbb-a338-144f32888929')
      expect(result.pt).toBe('Test Page')
      expect(result.txn_id).toBe('ol7lz')
      expect(result.type).toBe('javascript')
    })

    it('anonymizes fingerprinting vectors but keeps normalized values', () => {
      const result = stripFingerprintingFromPayload(FINGERPRINT_PAYLOAD.hardware)

      // Hardware generalized to common buckets
      expect(result.hardwareConcurrency).toBe(8)
      expect(result.deviceMemory).toBe(8)

      // Platform kept as-is (low entropy)
      expect(result.platform).toBe('MacIntel')

      // Browser data replaced with empty
      expect(result.plugins).toEqual([])
      expect(result.fonts).toEqual([])

      // Canvas/WebGL/Audio replaced with empty (pure fingerprints)
      expect(result.canvas).toBe('')
      expect(result.webgl).toEqual({})
      expect(result.audioFingerprint).toBe(0)

      // Timezone generalized
      expect(result.timezone).toBe('UTC')
      expect(result.timezoneOffset).toBe(360) // 300 bucketed to nearest 180

      // Screen generalized (objects get default bucket since generalizeScreen handles strings)
      expect(result.screen).toBe('1920x1080')
      expect(result.viewport).toBe('1920x1080')

      // Normalized
      expect(result.userAgent).toBe('Mozilla/5.0 (compatible; Chrome/120.0)')
      expect(result.language).toBe('en-US')
    })

    it('generalizes individual sh/sw dimensions to device-class buckets', () => {
      // Numeric sh/sw (e.g. Snapchat) — desktop class (paired: sw determines device class)
      const numResult = stripFingerprintingFromPayload({ sw: 1280, sh: 720 })
      expect(numResult.sw).toBe(1920)
      expect(numResult.sh).toBe(1080) // paired with sw → desktop height
      expect(typeof numResult.sw).toBe('number')
      expect(typeof numResult.sh).toBe('number')

      // String sh/sw (e.g. Reddit, Meta) — desktop class
      const strResult = stripFingerprintingFromPayload({ sw: '1280', sh: '720' })
      expect(strResult.sw).toBe('1920')
      expect(strResult.sh).toBe('1080') // paired with sw → desktop height
      expect(typeof strResult.sw).toBe('string')
      expect(typeof strResult.sh).toBe('string')

      // Mobile class
      const mobileResult = stripFingerprintingFromPayload({ sw: 375, sh: 667 })
      expect(mobileResult.sw).toBe(360)
      expect(mobileResult.sh).toBe(640)

      // Tablet class
      const tabletResult = stripFingerprintingFromPayload({ sw: 768, sh: 1024 })
      expect(tabletResult.sw).toBe(768)
      expect(tabletResult.sh).toBe(1024)

      // Combined sr format — desktop
      const srResult = stripFingerprintingFromPayload({ sr: '2560x1440' })
      expect(srResult.sr).toBe('1920x1080')

      // Combined sr format — tablet
      const srTablet = stripFingerprintingFromPayload({ sr: '768x1024' })
      expect(srTablet.sr).toBe('768x1024')

      // Combined sr format — mobile
      const srMobile = stripFingerprintingFromPayload({ sr: '375x667' })
      expect(srMobile.sr).toBe('360x640')
    })
  })
})

describe('resolvePrivacy', () => {
  it('true → all flags true', () => {
    expect(resolvePrivacy(true)).toEqual({ ip: true, userAgent: true, language: true, screen: true, timezone: true, hardware: true })
  })

  it('undefined → all flags false (opt-in)', () => {
    expect(resolvePrivacy()).toEqual({ ip: false, userAgent: false, language: false, screen: false, timezone: false, hardware: false })
  })

  it('false → all flags false', () => {
    expect(resolvePrivacy(false)).toEqual({ ip: false, userAgent: false, language: false, screen: false, timezone: false, hardware: false })
  })

  it('partial object → unset flags default to false (opt-in)', () => {
    expect(resolvePrivacy({ ip: true })).toEqual({ ip: true, userAgent: false, language: false, screen: false, timezone: false, hardware: false })
  })

  it('full object → uses provided values', () => {
    expect(resolvePrivacy({ ip: true, userAgent: true, language: false, screen: true, timezone: false, hardware: true }))
      .toEqual({ ip: true, userAgent: true, language: false, screen: true, timezone: false, hardware: true })
  })
})

describe('mergePrivacy', () => {
  const allTrue: ResolvedProxyPrivacy = { ip: true, userAgent: true, language: true, screen: true, timezone: true, hardware: true }

  it('undefined override → returns base', () => {
    expect(mergePrivacy(allTrue)).toEqual(allTrue)
  })

  it('boolean override fully replaces', () => {
    expect(mergePrivacy(allTrue, false)).toEqual({ ip: false, userAgent: false, language: false, screen: false, timezone: false, hardware: false })
  })

  it('partial object overrides only specified fields', () => {
    expect(mergePrivacy(allTrue, { ip: false })).toEqual({ ip: false, userAgent: true, language: true, screen: true, timezone: true, hardware: true })
  })

  it('per-script + global override flow', () => {
    // Ad pixel declares strict privacy
    const metaBase = resolvePrivacy({ ip: true, userAgent: true, language: false, screen: true, timezone: true, hardware: true })
    expect(metaBase).toEqual({ ip: true, userAgent: true, language: false, screen: true, timezone: true, hardware: true })

    // No global override → per-script used as-is
    expect(mergePrivacy(metaBase, undefined)).toEqual(metaBase)

    // User sets global { ip: false } → overrides just ip
    expect(mergePrivacy(metaBase, { ip: false }))
      .toEqual({ ip: false, userAgent: true, language: false, screen: true, timezone: true, hardware: true })

    // User sets global true → full anonymize overrides per-script
    expect(mergePrivacy(metaBase, true))
      .toEqual({ ip: true, userAgent: true, language: true, screen: true, timezone: true, hardware: true })

    // User sets global false → passthrough overrides per-script
    expect(mergePrivacy(metaBase, false))
      .toEqual({ ip: false, userAgent: false, language: false, screen: false, timezone: false, hardware: false })
  })
})

describe('selective privacy in stripPayloadFingerprinting', () => {
  const testPayload = {
    uip: '192.168.1.100',
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0',
    ul: 'en-US,en;q=0.9,fr;q=0.8',
    sr: '2560x1440',
    hardwareConcurrency: 8,
    canvas: 'abc123',
    timezone: 'America/New_York',
    dt: 'Page Title',
  }

  it('ip:false → IP passes through, everything else anonymized', () => {
    const privacy: ResolvedProxyPrivacy = { ip: false, userAgent: true, language: true, screen: true, timezone: true, hardware: true }
    const result = stripPayloadFingerprinting(testPayload, privacy)
    expect(result.uip).toBe('192.168.1.100') // not anonymized
    expect(result.ua).toBe('Mozilla/5.0 (compatible; Chrome/120.0)') // normalized
    expect(result.sr).toBe('1920x1080') // generalized
  })

  it('screen:false → screen/hardware pass through, canvas/timezone still anonymized', () => {
    const privacy: ResolvedProxyPrivacy = { ip: true, userAgent: true, language: true, screen: false, timezone: true, hardware: true }
    const result = stripPayloadFingerprinting(testPayload, privacy)
    expect(result.uip).toBe('192.168.1.0') // anonymized
    expect(result.sr).toBe('2560x1440') // not generalized (screen flag off)
    expect(result.hardwareConcurrency).toBe(8) // not bucketed (screen flag off)
    expect(result.canvas).toBe('') // stripped (hardware flag on)
    expect(result.timezone).toBe('UTC') // generalized (timezone flag on)
  })

  it('timezone:false → timezone passes through', () => {
    const privacy: ResolvedProxyPrivacy = { ip: false, userAgent: false, language: false, screen: true, timezone: false, hardware: true }
    const result = stripPayloadFingerprinting(testPayload, privacy)
    expect(result.timezone).toBe('America/New_York') // not generalized (timezone flag off)
    expect(result.sr).toBe('1920x1080') // generalized (screen flag on)
    expect(result.canvas).toBe('') // stripped (hardware flag on)
  })

  it('hardware:false → canvas/versions pass through', () => {
    const privacy: ResolvedProxyPrivacy = { ip: true, userAgent: true, language: true, screen: true, timezone: true, hardware: false }
    const result = stripPayloadFingerprinting(testPayload, privacy)
    expect(result.uip).toBe('192.168.1.0') // anonymized (ip flag on)
    expect(result.sr).toBe('1920x1080') // generalized (screen flag on)
    expect(result.canvas).toBe('abc123') // not stripped (hardware flag off)
    expect(result.timezone).toBe('UTC') // generalized (timezone flag on)
  })

  it('all false → everything passes through', () => {
    const privacy: ResolvedProxyPrivacy = { ip: false, userAgent: false, language: false, screen: false, timezone: false, hardware: false }
    const result = stripPayloadFingerprinting(testPayload, privacy)
    expect(result.uip).toBe('192.168.1.100')
    expect(result.ua).toBe(testPayload.ua)
    expect(result.ul).toBe('en-US,en;q=0.9,fr;q=0.8')
    expect(result.sr).toBe('2560x1440')
    expect(result.canvas).toBe('abc123')
    expect(result.timezone).toBe('America/New_York')
  })

  it('no privacy arg → defaults to all true (backward compat)', () => {
    const result = stripPayloadFingerprinting(testPayload)
    expect(result.uip).toBe('192.168.1.0')
    expect(result.ua).toBe('Mozilla/5.0 (compatible; Chrome/120.0)')
    expect(result.sr).toBe('1920x1080')
    expect(result.timezone).toBe('UTC')
  })
})
