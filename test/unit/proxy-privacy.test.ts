import { describe, it, expect } from 'vitest'
import {
  STRIP_PARAMS,
  NORMALIZE_PARAMS,
  ALLOWED_PARAMS,
  stripFingerprintingFromPayload,
} from '../utils/proxy-privacy'

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

      console.warn('GA fingerprinting params found:', fingerprintParams)
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
      const fingerprintParams: string[] = []

      for (const key of Object.keys(metaPayload)) {
        if (STRIP_PARAMS.ip.some(p => key.toLowerCase().includes(p.toLowerCase()))) fingerprintParams.push(key)
        if (STRIP_PARAMS.userId.some(p => key.toLowerCase() === p.toLowerCase())) fingerprintParams.push(key)
        if (STRIP_PARAMS.userData.some(p => key.toLowerCase() === p.toLowerCase())) fingerprintParams.push(key)
        if (STRIP_PARAMS.browser.some(p => key.toLowerCase().includes(p.toLowerCase()))) fingerprintParams.push(key)
      }

      console.warn('Meta fingerprinting params found:', fingerprintParams)
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

      console.warn('X/Twitter fingerprinting params found:', fingerprintParams)
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
      expect(result.client_user_agent).toBe('Mozilla/5.0 (compatible; Chrome)')
    })

    it('strips fingerprinting from X/Twitter pixel payload', () => {
      const result = stripFingerprintingFromPayload(FINGERPRINT_PAYLOAD.xPixel)

      // Should NOT have these fingerprinting params
      expect(result.dv).toBeUndefined() // Combined device info
      expect(result.bci).toBeUndefined() // Browser context
      expect(result.eci).toBeUndefined() // Environment context

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

    it('strips fingerprinting vectors but keeps normalized values', () => {
      const result = stripFingerprintingFromPayload(FINGERPRINT_PAYLOAD.fingerprint)

      // Fingerprinting stripped
      expect(result.hardwareConcurrency).toBeUndefined()
      expect(result.deviceMemory).toBeUndefined()
      expect(result.platform).toBeUndefined()
      expect(result.plugins).toBeUndefined()
      expect(result.canvas).toBeUndefined()
      expect(result.webgl).toBeUndefined()
      expect(result.audioFingerprint).toBeUndefined()
      expect(result.fonts).toBeUndefined()
      expect(result.timezone).toBeUndefined()

      // Screen generalized
      expect(result.screen).toBe('2560x1440')
      expect(result.viewport).toBe('1920x1080')

      // Normalized
      expect(result.userAgent).toBe('Mozilla/5.0 (compatible; Chrome)')
      expect(result.language).toBe('en')
    })
  })
})
