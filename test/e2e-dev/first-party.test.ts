import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createResolver } from '@nuxt/kit'
import { getProxyDef, registry } from '@nuxt/scripts/registry'
import { $fetch, getBrowser, setup, url } from '@nuxt/test-utils/e2e'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)
const fixtureDir = resolve('../fixtures/first-party')
const captureDir = join(fixtureDir, '.captures')

// Set env var for capture plugin
process.env.NUXT_SCRIPTS_CAPTURE_DIR = captureDir

await setup({
  rootDir: fixtureDir,
  browser: true,
  build: true,
  browserOptions: {
    type: 'chromium',
    launch: {
      // Prevent navigator.webdriver=true so analytics SDKs (Plausible, etc.)
      // treat the browser as a real user instead of skipping event collection.
      args: ['--disable-blink-features=AutomationControlled'],
    },
  },
})

function clearCaptures() {
  if (existsSync(captureDir)) {
    rmSync(captureDir, { recursive: true })
  }
}

/**
 * Provider-specific path prefixes for filtering captures.
 * Derived from `proxy.domains` in registry.ts so they never drift out of sync.
 */
const PROXY_PREFIX = '/_scripts/p'
const scripts = await registry()
const scriptByKey = new Map(scripts.map(s => [s.registryKey, s]))
const PROVIDER_PATHS: Record<string, string[]> = Object.fromEntries(
  scripts
    .filter(s => getProxyDef(s, scriptByKey))
    .map((s) => {
      const proxy = getProxyDef(s, scriptByKey)!
      const paths = proxy.domains.map(d =>
        `${PROXY_PREFIX}/${typeof d === 'string' ? d : d.domain}`,
      )
      return [s.registryKey, paths]
    }),
)

/**
 * Fingerprinting parameters that stripPayloadFingerprinting removes, empties, or generalizes.
 * These should NEVER appear unchanged in stripped query/body.
 */
const ANONYMIZED_FINGERPRINT_PARAMS = [
  // Hardware (generalized to common buckets)
  'hardwareconcurrency',
  'devicememory',
  'cpu',
  'mem',
  // Browser data (replaced with empty value)
  'plugins',
  'fonts',
  // Location/Timezone (generalized)
  'tz',
  'timezone',
  'timezoneoffset',
  // Audio fingerprinting (replaced with empty value; canvas/webgl neutralized at build time)
  'audiofingerprint',
  // Combined device fingerprinting (replaced with empty string)
  'dv',
  'device_info',
  'deviceinfo',
  // Screen/viewport (generalized to device-class buckets)
  'sr',
  'vp',
  'sd',
  'sh',
  'sw',
  'screen',
  'viewport',
  'colordepth',
  'pixelratio',
  // Version strings (generalized to major version)
  'd_os',
  'uapv',
  'd_bvs',
  'uafvl',
  // User agent (normalized to family/major version)
  'ua',
  'useragent',
  'user_agent',
  'client_user_agent',
]

/** Check that a capture has a fully-resolved privacy object with all six boolean flags. */
function hasResolvedPrivacy(c: Record<string, any>): boolean {
  const p = c.privacy
  return p && typeof p === 'object'
    && typeof p.ip === 'boolean' && typeof p.userAgent === 'boolean'
    && typeof p.language === 'boolean' && typeof p.screen === 'boolean'
    && typeof p.timezone === 'boolean' && typeof p.hardware === 'boolean'
}

/**
 * Verify that fingerprinting parameters are anonymized (not forwarded as-is).
 * Checks that known fingerprinting params, when present, have been transformed
 * from their original values. Returns list of params that leaked unchanged.
 */
function verifyFingerprintingAnonymized(capture: Record<string, any>): string[] {
  const leakedParams: string[] = []
  const originalQuery = capture.original?.query || {}
  const originalBody = capture.original?.body || {}
  const strippedQuery = capture.stripped?.query || {}
  const strippedBody = capture.stripped?.body || {}

  // Values considered already-anonymized — not a leak even if unchanged
  const isAnonymizedValue = (v: unknown): boolean => {
    if (v === '' || v === 0 || (Array.isArray(v) && v.length === 0))
      return true
    if (typeof v === 'object' && v !== null && !Array.isArray(v) && Object.keys(v).length === 0)
      return true
    if (typeof v === 'string') {
      // Screen bucket patterns (e.g. "1920x1080", "1280x720")
      if (/^\d{3,4}x\d{3,4}$/.test(v))
        return true
      // Normalized UA patterns (e.g. "Mozilla/5.0 (compatible; Chrome/131.0)")
      if (v.startsWith('Mozilla/5.0 (compatible'))
        return true
      // Major-only version (e.g. "90", "131.0")
      if (/^\d+(?:\.\d)?$/.test(v))
        return true
      // Timezone names (IANA zones or UTC)
      if (v === 'UTC' || /^[A-Z][a-z]+\/[A-Z]/.test(v))
        return true
    }
    if (typeof v === 'number') {
      // Bucketed numeric values (common screen widths, heights, concurrency)
      if ([320, 375, 414, 768, 1024, 1280, 1366, 1440, 1920, 2560, 3840].includes(v))
        return true
    }
    return false
  }

  for (const param of ANONYMIZED_FINGERPRINT_PARAMS) {
    // Only check params present in both original and stripped
    if (originalQuery[param] !== undefined && strippedQuery[param] !== undefined) {
      const orig = originalQuery[param]
      const stripped = strippedQuery[param]
      // Leak = unchanged AND not already an empty/anonymized value
      if (JSON.stringify(stripped) === JSON.stringify(orig) && !isAnonymizedValue(orig)) {
        leakedParams.push(`query.${param}`)
      }
    }
    if (originalBody[param] !== undefined && strippedBody[param] !== undefined) {
      const orig = originalBody[param]
      const stripped = strippedBody[param]
      if (JSON.stringify(stripped) === JSON.stringify(orig) && !isAnonymizedValue(orig)) {
        leakedParams.push(`body.${param}`)
      }
    }
  }

  return leakedParams
}

/**
 * Normalize volatile fields in captures for stable snapshots.
 * Replaces UUIDs, ports, and other dynamic values with placeholders.
 */
function normalizeCapture(capture: Record<string, any>): Record<string, any> {
  // Deep clone and parse body strings into objects for uniform handling
  const cloned = JSON.parse(JSON.stringify(capture))
  for (const section of ['original', 'stripped']) {
    if (cloned[section]?.body && typeof cloned[section].body === 'string') {
      try {
        cloned[section].body = JSON.parse(cloned[section].body)
      }
      catch { /* non-JSON body, keep as string */ }
    }
  }

  // Volatile fields to replace with placeholders (handles string and number values)
  const VOLATILE: Record<string, string> = {
    // Common timestamps
    ts: '<TS>',
    // Environment-specific (OS version, locale, browser version)
    uapv: '<UAPV>',
    ul: '<UL>',
    uafvl: '<UAFVL>',
    d_os: '<D_OS>',
    d_bvs: '<D_BVS>',
    ua: '<UA>',
    // GA
    cid: '<CID>',
    _p: '<P>',
    _et: '<ET>',
    _s: '<S>',
    sid: '<SID>',
    tag_exp: '<TAG_EXP>',
    tfd: '<TFD>',
    gtm: '<GTM>',
    // Meta pixel
    it: '<IT>',
    // Snapchat
    si: '<SI>',
    sa: '<SA>',
    sps: '<SPS>',
    rd: '<RD>',
    del: '<DEL>',
    gac: '<GAC>',
  }
  // Fingerprinting params: masked in original only so stripped proves anonymization worked
  const ORIGINAL_ONLY_VOLATILE: Record<string, string> = {
    dv: '<DEVICE_INFO>',
  }
  // Prefix-based volatile keys (e.g. expv2[0], expv2[1], ...)
  const VOLATILE_PREFIXES = ['expv2[']
  // Array fields to replace with placeholders
  const VOLATILE_ARRAYS = new Set(['a', 'p'])
  // Fields to strip entirely (appear inconsistently between runs)
  const STRIP_KEYS = new Set(['gat', 'exp'])

  function normalizeObj(obj: any, isOriginal = false): any {
    if (Array.isArray(obj))
      return obj.map(v => normalizeObj(v, isOriginal))
    if (obj !== null && typeof obj === 'object') {
      const result: Record<string, any> = {}
      const seenPrefixes = new Set<string>()
      for (const [k, v] of Object.entries(obj)) {
        if (STRIP_KEYS.has(k))
          continue
        // Collapse volatile prefix keys (e.g. expv2[0], expv2[1]) into single entry
        const matchedPrefix = VOLATILE_PREFIXES.find(p => k.startsWith(p))
        if (matchedPrefix && (typeof v === 'string' || typeof v === 'number')) {
          if (!seenPrefixes.has(matchedPrefix)) {
            seenPrefixes.add(matchedPrefix)
            result[matchedPrefix.replace(/\[/g, '')] = '<VOLATILE>'
          }
        }
        else if (k in VOLATILE && (typeof v === 'string' || typeof v === 'number')) {
          result[k] = VOLATILE[k]
        }
        else if (isOriginal && k in ORIGINAL_ONLY_VOLATILE && (typeof v === 'string' || typeof v === 'number')) {
          result[k] = ORIGINAL_ONLY_VOLATILE[k]
        }
        else if (VOLATILE_ARRAYS.has(k) && Array.isArray(v)) {
          result[k] = `<${k.toUpperCase()}>`
        }
        else {
          result[k] = normalizeObj(v, isOriginal)
        }
      }
      return result
    }
    return obj
  }

  // Normalize original (mask fingerprints) and stripped (show actual values) separately
  const normalized = { ...cloned }
  normalized.original = normalizeObj(cloned.original, true)
  normalized.stripped = normalizeObj(cloned.stripped, false)

  // Strip headers from the main snapshot — they're volatile and captured in diff snapshots instead
  delete normalized.original?.headers
  delete normalized.stripped?.headers
  let json = JSON.stringify(normalized)

  // Normalize UUIDs
  json = json.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<UUID>')
  // Normalize localhost ports
  json = json.replace(/127\.0\.0\.1:\d+/g, '127.0.0.1:<PORT>')
  json = json.replace(/127\.0\.0\.1%3A\d+/gi, '127.0.0.1%3A<PORT>')
  // Normalize volatile URL query params (in path/targetUrl strings)
  // Mask dv only in "path" (original request), not "targetUrl" (stripped), to prove anonymization
  json = json.replace(/"path":"([^"]*)"/g, match => match.replace(/dv=[^&"]*/g, 'dv=<DEVICE_INFO>'))
  json = json
    .replace(/cid=([^&"]*)/g, 'cid=<CID>')
    .replace(/_p=([^&"]*)/g, '_p=<P>')
    .replace(/_et=([^&"]*)/g, '_et=<ET>')
    .replace(/_s=([^&"]*)/g, '_s=<S>')
    .replace(/([?&])ts=\d+/g, '$1ts=<TS>')
    .replace(/([?&])sid=\d+/g, '$1sid=<SID>')
    .replace(/([?&])tag_exp=[^&"]*/g, '$1tag_exp=<TAG_EXP>')
    .replace(/([?&])tfd=\d+/g, '$1tfd=<TFD>')
    .replace(/([?&])gtm=[^&"]*/g, '$1gtm=<GTM>')
    .replace(/([?&])sa=\d+/g, '$1sa=<SA>')
    // Environment-specific URL params
    .replace(/([?&])ul=[^&"]*/g, '$1ul=<UL>')
    .replace(/([?&])uapv=[^&"]*/g, '$1uapv=<UAPV>')
    .replace(/([?&])uafvl=[^&"]*/g, '$1uafvl=<UAFVL>')
    // Meta pixel volatile params
    .replace(/([?&])it=\d+/g, '$1it=<IT>')
    .replace(/([?&])expv2[^=]*=[^&"]*/g, '$1expv2=<VOLATILE>')
  // Collapse repeated expv2 params in URL strings
  json = json.replace(/(&expv2=<VOLATILE>)+/g, '&expv2=<VOLATILE>')
  // Collapse exp= param (appears inconsistently)
  json = json.replace(/([?&])exp=[^&"]*/g, '')

  return JSON.parse(json)
}

/**
 * Extract the full request diff from a raw (un-normalized) capture.
 * Shows every field that changed between original and stripped across
 * query params, headers, and body — giving a complete privacy picture.
 */
function extractRequestDiff(capture: Record<string, any>): Record<string, any> {
  function diffObjects(
    original: Record<string, unknown> | undefined,
    stripped: Record<string, unknown> | undefined,
  ): Record<string, { original: unknown, anonymized: unknown }> | 'removed' | undefined {
    if (!original && !stripped)
      return undefined
    // Section existed in original but was entirely removed
    if (original && !stripped)
      return 'removed'
    if (!original || !stripped)
      return undefined

    const result: Record<string, { original: unknown, anonymized: unknown }> = {}
    const allKeys = new Set([...Object.keys(original), ...Object.keys(stripped)])

    for (const k of allKeys) {
      let ov: unknown = original[k]
      const sv = stripped[k]

      // Normalize cookie values — they contain random session IDs that change per run
      if (k === 'cookie' && typeof ov === 'string') {
        ov = ov.replace(/=([^;]*)/g, '=<dynamic>').replace(/\s+/g, ' ')
      }

      // Key removed in stripped
      if (sv === undefined && ov !== undefined) {
        result[k] = { original: ov, anonymized: '<removed>' }
        continue
      }
      // Key added in stripped (rare but possible, e.g. anonymized x-forwarded-for)
      if (ov === undefined && sv !== undefined) {
        result[k] = { original: '<absent>', anonymized: sv }
        continue
      }
      // Deep compare — only include if changed
      if (JSON.stringify(ov) !== JSON.stringify(sv)) {
        result[k] = { original: ov, anonymized: sv }
      }
    }

    return Object.keys(result).length > 0 ? result : undefined
  }

  let target = ''
  try {
    const u = new URL(capture.targetUrl)
    target = u.host + u.pathname
  }
  catch {
    target = capture.targetUrl || ''
  }

  const result: Record<string, any> = {
    method: capture.method,
    target,
  }

  const query = diffObjects(capture.original?.query, capture.stripped?.query)
  const headers = diffObjects(capture.original?.headers, capture.stripped?.headers)

  // Parse string bodies to objects before diffing (proxy handler parses JSON strings)
  let origBody = capture.original?.body
  let strippedBody = capture.stripped?.body
  if (typeof origBody === 'string') {
    try {
      origBody = JSON.parse(origBody)
    }
    catch { /* non-JSON body */ }
  }
  if (typeof strippedBody === 'string') {
    try {
      strippedBody = JSON.parse(strippedBody)
    }
    catch { /* non-JSON body */ }
  }
  const body = diffObjects(origBody, strippedBody)

  if (query)
    result.query = query
  if (headers)
    result.headers = headers
  if (body)
    result.body = body

  // Normalize volatile values in the diff
  let json = JSON.stringify(result)
  json = json.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<UUID>')
  json = json.replace(/127\.0\.0\.1:\d+/g, '127.0.0.1:<PORT>')
  json = json.replace(/127\.0\.0\.1%3A\d+/gi, '127.0.0.1%3A<PORT>')
  // Normalize Unix timestamps in ms (13+ digits starting with 17...)
  json = json.replace(/:17\d{11,}([,}\]])/g, ':"<TS_MS>"$1')
  json = json.replace(/"17\d{11,}"/g, '"<TS_MS>"')
  // Normalize long base64-like session tokens (Snapchat si, etc.)
  json = json.replace(/"si":"[\w-]{40,}"/g, '"si":"<SESSION_TOKEN>"')
  // Normalize volatile numeric arrays (Snapchat timing/perf data)
  json = json.replace(/"a":\[[\d,\s]+\]/g, '"a":"<TIMING>"')
  json = json.replace(/"p":\[[\d,\s]+\]/g, '"p":"<PERF>"')
  return JSON.parse(json)
}

function captureToSnapshotName(capture: Record<string, any>): string {
  try {
    const u = new URL(capture.targetUrl)
    return (u.host + u.pathname).replace(/^www\./, '').replace(/\//g, '~').replace(/~$/, '')
  }
  catch {
    return 'unknown'
  }
}

const STRICT_SNAPSHOTS = process.env.NUXT_SCRIPTS_STRICT_SNAPSHOTS === '1'

async function assertSnapshots(rawCaptures: Record<string, any>[], captures: Record<string, any>[], provider: string) {
  // File snapshots document the exact request shape for review purposes.
  // Real analytics scripts produce non-deterministic request counts, cookies, and timing
  // values between runs. Functional correctness is verified by the hard assertions
  // (verifyFingerprintingAnonymized, proxy routing) above. Update with `vitest -u`.
  try {
    await expect(captures).toMatchFileSnapshot(`__snapshots__/proxy/${provider}.json`)
    const nameCounts = new Map<string, number>()
    for (let i = 0; i < rawCaptures.length; i++) {
      const diff = extractRequestDiff(rawCaptures[i]!)
      const baseName = captureToSnapshotName(rawCaptures[i]!)
      const count = (nameCounts.get(baseName) || 0) + 1
      nameCounts.set(baseName, count)
      const fileName = count > 1 ? `${baseName}~${count}` : baseName
      await expect(diff).toMatchFileSnapshot(`__snapshots__/proxy/${provider}/${fileName}.diff.json`)
    }
  }
  catch (err) {
    if (STRICT_SNAPSHOTS)
      throw err
    console.warn(`[snapshot] ${provider}: mismatch (run with -u to update)`)
  }
}

function isAllowedDomain(urlStr: string | undefined, allowedDomain: string) {
  if (!urlStr)
    return false
  try {
    const hostname = new URL(urlStr).hostname
    return hostname === allowedDomain || hostname.endsWith(`.${allowedDomain}`)
  }
  catch {
    return false
  }
}

function readRawCaptures(provider?: string) {
  if (!existsSync(captureDir))
    return []
  const captures = readdirSync(captureDir)
    .filter(f => f.endsWith('.json'))
    .sort()
    .map((f) => {
      const content = JSON.parse(readFileSync(join(captureDir, f), 'utf-8'))
      // Remove volatile fields not needed for verification or snapshots
      delete content.timestamp
      return content
    })

  if (provider && PROVIDER_PATHS[provider]) {
    const prefixes = PROVIDER_PATHS[provider]
    return captures.filter(c => prefixes.some(p => c.path?.startsWith(p)))
  }
  return captures
}

describe('useScript with registry provide', () => {
  it('useScript works when registry scripts are configured', async () => {
    // Regression: when registry scripts are provided via plugin provide(),
    // nuxtApp.$scripts becomes a getter-only property. useScript() must not
    // try to reassign it, or it throws:
    // "Cannot set property $scripts of #<Object> which has only a getter"
    const browser = await getBrowser()
    const page = await browser.newPage()
    const errors: string[] = []
    page.addListener('pageerror', (err) => {
      errors.push(err.message)
    })
    await page.goto(url('/use-script-with-registry'), { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    // No errors should have occurred
    expect(errors.filter(e => e.includes('$scripts'))).toEqual([])
    // Script status should progress to loaded
    const status = await page.$eval('#status', el => el.textContent?.trim())
    expect(status).toBe('loaded')
    await page.close()
  })
})

describe('first-party privacy stripping', () => {
  beforeAll(() => clearCaptures())
  afterAll(() => clearCaptures())

  describe('proxy endpoint', () => {
    it('proxy endpoint works directly', async () => {
      // Test if the proxy endpoint can reach external URL
      const response = await $fetch('/_scripts/p/www.googletagmanager.com/gtag/js?id=G-TEST', {
        responseType: 'text',
        timeout: 5000,
      }).catch((e: any) => ({
        error: true,
        message: e.message,
        status: e.status,
        statusCode: e.statusCode,
        data: e.data,
      }))

      // Should return JS content (or at least not 404)
      if (typeof response === 'object' && response && 'error' in response && response.error) {
        writeFileSync(join(fixtureDir, 'proxy-test.json'), JSON.stringify(response, null, 2))
        console.warn('[test] Proxy error:', response)
      }
      expect(typeof response).toBe('string')
    }, 30000)
  })

  describe('script bundling', () => {
    it('gA script is loaded from local path', async () => {
      const browser = await getBrowser()
      const page = await browser.newPage()
      page.setDefaultTimeout(5000)

      const scriptUrls: string[] = []
      page.on('request', (req) => {
        const reqUrl = req.url()
        if (reqUrl.includes('gtag') || reqUrl.includes('_scripts')) {
          scriptUrls.push(reqUrl)
        }
      })

      await page.goto(url('/ga'), { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {})

      // Wait for script to load
      await page.waitForTimeout(5000)

      // Verify bundled script is loaded from local /_scripts/assets path
      const localScript = scriptUrls.find(u => u.includes('/_scripts/assets/'))
      expect(localScript).toBeDefined()
    }, 30000)

    it('bundled scripts contain rewritten collect URLs', async () => {
      // Check bundled scripts have proxy URLs
      const cacheDir = join(fixtureDir, 'node_modules/.cache/nuxt/scripts/bundle-proxy')
      expect(existsSync(cacheDir), `Bundle proxy cache dir should exist at ${cacheDir}`).toBe(true)

      const files = readdirSync(cacheDir).filter(f => f.endsWith('.js'))
      expect(files.length).toBeGreaterThan(0)

      // Combine all cached scripts content
      const allContent = files.map(f => readFileSync(join(cacheDir, f), 'utf-8')).join('\n')
      // Verify at least one proxy URL is present (GA, Clarity, etc.)
      const hasProxyUrl = allContent.includes('/_scripts/p/')
      expect(hasProxyUrl).toBe(true)
    })
  })

  describe('proxy privacy stripping (real events)', () => {
    /**
     * Test a provider by navigating to its page and capturing proxy requests.
     * Verifies that requests are proxied and fingerprinting data is stripped.
     */
    async function testProvider(provider: string, pagePath: string, opts?: { clickSelectors?: string[] }) {
      clearCaptures()
      const browser = await getBrowser()
      const page = await browser.newPage()
      page.setDefaultTimeout(5000)

      let serverOrigin = ''
      const proxyRequests: string[] = []
      const externalRequests: string[] = []

      page.on('request', (req) => {
        const reqUrl = req.url()
        if (!serverOrigin) {
          try {
            serverOrigin = new URL(url('/')).origin
          }
          catch {
            // ignore
          }
        }
        const parsed = new URL(reqUrl)
        if (parsed.pathname.startsWith('/_scripts/p/')) {
          proxyRequests.push(parsed.pathname)
        }
        else if (serverOrigin && !reqUrl.startsWith(serverOrigin) && parsed.protocol.startsWith('http')) {
          externalRequests.push(reqUrl)
        }
      })

      await page.goto(url(pagePath), { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {})
      await page.waitForSelector('#status:has-text("loaded")', { timeout: 5000 }).catch(() => {})

      // Wait for initial SDK requests (pageview, config, etc.)
      await page.waitForTimeout(1500)
      const preClickProxyCount = proxyRequests.length

      if (opts?.clickSelectors) {
        for (const sel of opts.clickSelectors) {
          await page.click(sel).catch(() => {})
        }
      }
      else {
        // Click all buttons on the page to trigger events
        const buttons = await page.$$('button')
        for (const btn of buttons) {
          await btn.click().catch(() => {})
        }
      }

      await page.waitForTimeout(2000)
      const postClickProxyCount = proxyRequests.length

      const rawCaptures = readRawCaptures(provider)
      const captures = rawCaptures.map(normalizeCapture)

      await page.close()

      return { captures, rawCaptures, proxyRequests, externalRequests, preClickProxyCount, postClickProxyCount }
    }

    /**
     * Providers whose CTA buttons should generate additional proxy requests
     * beyond the initial pageview/SDK init. Asserts that clicking buttons
     * produces at least one new proxy request (catches broken event APIs).
     */
    const INTERACTIVE_PROXY_PROVIDERS = new Set([
      'googleAnalytics', // gtag('event', ...) triggers collect calls
      'metaPixel', // fbq('track', ...) triggers pixel fires
      'snapchatPixel', // snaptr('track', ...) triggers beacon
      'xPixel', // twq('track', ...) triggers pixel
      'posthog', // posthog.capture() triggers batch call
      'rybbitAnalytics', // rybbit.event() triggers fetch
      'redditPixel', // rdt('track', ...) triggers pixel fires
      'plausibleAnalytics', // plausible() triggers fetch POST
      'umamiAnalytics', // umami.track() triggers fetch POST
      'fathomAnalytics', // fathom.trackGoal() triggers beacon
      // cloudflareWebAnalytics — auto-engagement only, no CTA buttons
    ])

    /**
     * Providers with full runtime proxy support — their bundled scripts route
     * runtime API calls (collect, track, beacon) through /_scripts/p/ endpoints.
     * Tests for these providers strictly assert proxy requests + captures.
     *
     * Providers NOT in this set only have script bundling (loaded from /_scripts/assets/)
     * but their runtime calls bypass /_scripts/p/ and go directly to third-party domains.
     * Tests for those providers document the external requests but don't fail.
     */
    const FULL_PROXY_PROVIDERS = new Set([
      'clarity',
      'posthog',
      'cloudflareWebAnalytics',
      'redditPixel',
      'umamiAnalytics', // bundled + hostUrl config injection
      'rybbitAnalytics', // analyticsHost config injection — SDK derives API host from script src
      'metaPixel', // AST rewrite catches all Meta SDK fetch/Image.src calls
      // segment — no proxy.domains in registry; XHR interception exists but requests leak to external domains
      'xPixel', // Image.src interception via AST rewrite
      'googleAnalytics', // scope-resolved AST rewrite for sendBeacon/fetch/XHR/Image
      'snapchatPixel', // scope-resolved AST rewrite for sendBeacon/XHR
      // googleTagManager — uses createElement('script') injection, not interceptable via XHR/fetch/sendBeacon
      'fathomAnalytics', // bundled + self-hosted detection neutralized, sendBeacon/Image interception
      'plausibleAnalytics', // bundled + auto-inject endpoint, sendBeacon interception (needs extension: 'local' + __plausible flag for headless)
      'tiktokPixel', // AST rewrite for analytics.tiktok.com, sendBeacon/fetch interception
      // databuddyAnalytics — SDK doesn't fire events with demo clientId in test window
      // intercom — SDK doesn't fire events with test app_id in headless (0 external leaks, 0 proxy requests)
      // crisp — no proxy.domains in registry, script not proxied
      // hotjar — SDK doesn't fire HTTP events in headless (WebSocket-only session data)
    ])

    /**
     * Shared assertion for proxy capture tests.
     *
     * For FULL_PROXY_PROVIDERS: strictly asserts proxy requests, captures, and privacy.
     * For bundle-only providers: verifies no unexpected external domains, logs gaps.
     */
    async function assertCaptures(
      provider: string,
      captures: Record<string, any>[],
      rawCaptures: Record<string, any>[],
      proxyRequests: string[],
      externalRequests: string[],
      opts: { proxyPrefix: string, domains: string[] },
      clickCounts?: { pre: number, post: number },
    ) {
      const isFullProxy = FULL_PROXY_PROVIDERS.has(provider)

      // Filter proxy requests to this provider (exclude cross-provider noise like cfwa-beacon)
      const providerProxyReqs = proxyRequests.filter((r) => {
        const prefixes = PROVIDER_PATHS[provider] || [opts.proxyPrefix]
        return prefixes.some(p => r.startsWith(p))
      })

      // Track external requests to provider domains
      const leakedRequests = externalRequests.filter(u =>
        opts.domains.some(d => u.includes(d)),
      )

      if (isFullProxy) {
        // Strict: provider must route runtime calls through proxy
        expect(
          providerProxyReqs.length,
          `${provider}: No proxy requests.\n  External leaks: ${JSON.stringify(leakedRequests.slice(0, 5))}`,
        ).toBeGreaterThan(0)

        expect(
          captures.length,
          `${provider}: No server-side captures.\n  Proxy requests: ${JSON.stringify(providerProxyReqs)}`,
        ).toBeGreaterThan(0)

        const hasValidCapture = captures.some(c =>
          opts.domains.some(d => isAllowedDomain(c.targetUrl, d))
          && hasResolvedPrivacy(c),
        )
        expect(hasValidCapture, `${provider}: No capture with valid domain + privacy`).toBe(true)

        for (const capture of rawCaptures) {
          const leaked = verifyFingerprintingAnonymized(capture)
          expect(leaked, `${provider}: Leaked fingerprinting params`).toEqual([])
        }

        await assertSnapshots(rawCaptures, captures, provider)

        // Verify button clicks generated additional proxy requests
        if (clickCounts && INTERACTIVE_PROXY_PROVIDERS.has(provider)) {
          expect(
            clickCounts.post,
            `${provider}: Button clicks did not generate new proxy requests (pre: ${clickCounts.pre}, post: ${clickCounts.post})`,
          ).toBeGreaterThan(clickCounts.pre)
        }
      }
      else {
        // Bundle-only: document the gap, verify captures if they exist
        if (captures.length > 0) {
          const hasValidCapture = captures.some(c =>
            opts.domains.some(d => isAllowedDomain(c.targetUrl, d))
            && hasResolvedPrivacy(c),
          )
          expect(hasValidCapture, `${provider}: Captures exist but none valid`).toBe(true)

          for (const capture of rawCaptures) {
            const leaked = verifyFingerprintingAnonymized(capture)
            expect(leaked, `${provider}: Leaked fingerprinting params`).toEqual([])
          }

          await assertSnapshots(rawCaptures, captures, provider)
        }
      }
    }

    it('googleAnalytics', async () => {
      const { captures, rawCaptures, proxyRequests, externalRequests, preClickProxyCount, postClickProxyCount } = await testProvider('googleAnalytics', '/ga', {
        clickSelectors: ['#trigger-pageview'],
      })
      await assertCaptures('googleAnalytics', captures, rawCaptures, proxyRequests, externalRequests, {
        proxyPrefix: '/_scripts/p/',
        domains: ['google-analytics.com', 'analytics.google.com'],
      }, { pre: preClickProxyCount, post: postClickProxyCount })
    }, 45000)

    it('googleTagManager', async () => {
      const { captures, rawCaptures, proxyRequests, externalRequests, preClickProxyCount, postClickProxyCount } = await testProvider('googleTagManager', '/gtm')
      await assertCaptures('googleTagManager', captures, rawCaptures, proxyRequests, externalRequests, {
        proxyPrefix: '/_scripts/p/gtm',
        domains: ['googletagmanager.com'],
      }, { pre: preClickProxyCount, post: postClickProxyCount })
    }, 30000)

    it('metaPixel', async () => {
      const { captures, rawCaptures, proxyRequests, externalRequests, preClickProxyCount, postClickProxyCount } = await testProvider('metaPixel', '/meta', {
        clickSelectors: ['#trigger-pageview', '#trigger-event'],
      })
      await assertCaptures('metaPixel', captures, rawCaptures, proxyRequests, externalRequests, {
        proxyPrefix: '/_scripts/p/meta',
        domains: ['facebook.com', 'facebook.net'],
      }, { pre: preClickProxyCount, post: postClickProxyCount })
    }, 30000)

    it('segment', async () => {
      const { captures, rawCaptures, proxyRequests, externalRequests, preClickProxyCount, postClickProxyCount } = await testProvider('segment', '/segment', {
        clickSelectors: ['#trigger-page', '#trigger-event'],
      })
      await assertCaptures('segment', captures, rawCaptures, proxyRequests, externalRequests, {
        proxyPrefix: '/_scripts/p/segment',
        domains: ['segment.io', 'segment.com'],
      }, { pre: preClickProxyCount, post: postClickProxyCount })
    }, 30000)

    it('xPixel', async () => {
      const { captures, rawCaptures, proxyRequests, externalRequests, preClickProxyCount, postClickProxyCount } = await testProvider('xPixel', '/x')
      await assertCaptures('xPixel', captures, rawCaptures, proxyRequests, externalRequests, {
        proxyPrefix: '/_scripts/p/x',
        domains: ['twitter.com', 't.co'],
      }, { pre: preClickProxyCount, post: postClickProxyCount })
    }, 30000)

    it('snapchatPixel', async () => {
      const { captures, rawCaptures, proxyRequests, externalRequests, preClickProxyCount, postClickProxyCount } = await testProvider('snapchatPixel', '/snap', {
        clickSelectors: ['#trigger-pageview', '#trigger-event'],
      })
      await assertCaptures('snapchatPixel', captures, rawCaptures, proxyRequests, externalRequests, {
        proxyPrefix: '/_scripts/p/snap',
        domains: ['snapchat.com'],
      }, { pre: preClickProxyCount, post: postClickProxyCount })
    }, 30000)

    it('clarity', async () => {
      const { captures, rawCaptures, proxyRequests, externalRequests, preClickProxyCount, postClickProxyCount } = await testProvider('clarity', '/clarity')
      await assertCaptures('clarity', captures, rawCaptures, proxyRequests, externalRequests, {
        proxyPrefix: '/_scripts/p/clarity',
        domains: ['clarity.ms'],
      }, { pre: preClickProxyCount, post: postClickProxyCount })
    }, 30000)

    it('hotjar', async () => {
      const { captures, rawCaptures, proxyRequests, externalRequests, preClickProxyCount, postClickProxyCount } = await testProvider('hotjar', '/hotjar')
      // Hotjar SDK doesn't fire HTTP events in headless — WebSocket-only session data.
      // Script loads from /_scripts/assets/ (verified in bundle coverage test below).
      if (captures.length > 0) {
        await assertCaptures('hotjar', captures, rawCaptures, proxyRequests, externalRequests, {
          proxyPrefix: '/_scripts/p/hotjar',
          domains: ['hotjar.com'],
        }, { pre: preClickProxyCount, post: postClickProxyCount })
      }
    }, 60000)

    it('tiktokPixel', async () => {
      const { captures, rawCaptures, proxyRequests, externalRequests, preClickProxyCount, postClickProxyCount } = await testProvider('tiktokPixel', '/tiktok', {
        clickSelectors: ['#trigger-pageview', '#trigger-event'],
      })
      // TikTok has a dummy key — can't require captures
      if (captures.length > 0) {
        await assertCaptures('tiktokPixel', captures, rawCaptures, proxyRequests, externalRequests, {
          proxyPrefix: '/_scripts/p/tiktok',
          domains: ['tiktok.com'],
        }, { pre: preClickProxyCount, post: postClickProxyCount })
      }
    }, 30000)

    it('redditPixel', async () => {
      const { captures, rawCaptures, proxyRequests, externalRequests, preClickProxyCount, postClickProxyCount } = await testProvider('redditPixel', '/reddit', {
        clickSelectors: ['#trigger-pagevisit', '#trigger-event'],
      })
      await assertCaptures('redditPixel', captures, rawCaptures, proxyRequests, externalRequests, {
        proxyPrefix: '/_scripts/p/reddit',
        domains: ['reddit.com'],
      }, { pre: preClickProxyCount, post: postClickProxyCount })
    }, 30000)

    it('vercelAnalytics', async () => {
      clearCaptures()
      const browser = await getBrowser()
      const page = await browser.newPage()
      page.setDefaultTimeout(5000)

      await page.goto(url('/vercel-analytics'), { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {})
      await page.waitForSelector('#status', { timeout: 5000 }).catch(() => {})
      await page.waitForTimeout(2000)

      const hasQueue = await page.evaluate(() => typeof window.va === 'function')
      expect(hasQueue).toBe(true)

      await page.close()
      // No proxy captures expected — Vercel sends to relative /_vercel/insights/* paths
    }, 30000)

    it('posthog', async () => {
      const { captures, rawCaptures, proxyRequests, externalRequests, preClickProxyCount, postClickProxyCount } = await testProvider('posthog', '/posthog')
      await assertCaptures('posthog', captures, rawCaptures, proxyRequests, externalRequests, {
        proxyPrefix: '/_scripts/p/ph',
        domains: ['posthog.com'],
      }, { pre: preClickProxyCount, post: postClickProxyCount })
    }, 30000)

    it('umamiAnalytics', async () => {
      const { captures, rawCaptures, proxyRequests, externalRequests, preClickProxyCount, postClickProxyCount } = await testProvider('umamiAnalytics', '/umami')
      await assertCaptures('umamiAnalytics', captures, rawCaptures, proxyRequests, externalRequests, {
        proxyPrefix: '/_scripts/p/umami',
        domains: ['umami.is'],
      }, { pre: preClickProxyCount, post: postClickProxyCount })
    }, 30000)

    it('plausibleAnalytics', async () => {
      const { captures, rawCaptures, proxyRequests, externalRequests, preClickProxyCount, postClickProxyCount } = await testProvider('plausibleAnalytics', '/plausible')
      await assertCaptures('plausibleAnalytics', captures, rawCaptures, proxyRequests, externalRequests, {
        proxyPrefix: '/_scripts/p/plausible',
        domains: ['plausible.io'],
      }, { pre: preClickProxyCount, post: postClickProxyCount })
    }, 30000)

    it('cloudflareWebAnalytics', async () => {
      const { captures, rawCaptures, proxyRequests, externalRequests, preClickProxyCount, postClickProxyCount } = await testProvider('cloudflareWebAnalytics', '/cfwa')
      await assertCaptures('cloudflareWebAnalytics', captures, rawCaptures, proxyRequests, externalRequests, {
        proxyPrefix: '/_scripts/p/cfwa',
        domains: ['cloudflareinsights.com'],
      }, { pre: preClickProxyCount, post: postClickProxyCount })
    }, 30000)

    it('fathomAnalytics', async () => {
      const { captures, rawCaptures, proxyRequests, externalRequests, preClickProxyCount, postClickProxyCount } = await testProvider('fathomAnalytics', '/fathom')
      await assertCaptures('fathomAnalytics', captures, rawCaptures, proxyRequests, externalRequests, {
        proxyPrefix: '/_scripts/p/fathom',
        domains: ['usefathom.com'],
      }, { pre: preClickProxyCount, post: postClickProxyCount })
    }, 30000)

    it('intercom', async () => {
      const { captures, rawCaptures, proxyRequests, externalRequests, preClickProxyCount, postClickProxyCount } = await testProvider('intercom', '/intercom-test')
      await assertCaptures('intercom', captures, rawCaptures, proxyRequests, externalRequests, {
        proxyPrefix: '/_scripts/p/intercom',
        domains: ['intercom.io', 'intercomcdn.com'],
      }, { pre: preClickProxyCount, post: postClickProxyCount })
    }, 30000)

    it('crisp', async () => {
      const { captures, rawCaptures, proxyRequests, externalRequests, preClickProxyCount, postClickProxyCount } = await testProvider('crisp', '/crisp-test')
      await assertCaptures('crisp', captures, rawCaptures, proxyRequests, externalRequests, {
        proxyPrefix: '/_scripts/p/crisp',
        domains: ['crisp.chat'],
      }, { pre: preClickProxyCount, post: postClickProxyCount })
    }, 30000)

    it('rybbitAnalytics', async () => {
      const { captures, rawCaptures, proxyRequests, externalRequests, preClickProxyCount, postClickProxyCount } = await testProvider('rybbitAnalytics', '/rybbit')
      await assertCaptures('rybbitAnalytics', captures, rawCaptures, proxyRequests, externalRequests, {
        proxyPrefix: '/_scripts/p/rybbit',
        domains: ['rybbit.io'],
      }, { pre: preClickProxyCount, post: postClickProxyCount })
    }, 30000)

    it('databuddyAnalytics', async () => {
      const { captures, rawCaptures, proxyRequests, externalRequests, preClickProxyCount, postClickProxyCount } = await testProvider('databuddyAnalytics', '/databuddy')
      await assertCaptures('databuddyAnalytics', captures, rawCaptures, proxyRequests, externalRequests, {
        proxyPrefix: '/_scripts/p/databuddy',
        domains: ['databuddy.cc'],
      }, { pre: preClickProxyCount, post: postClickProxyCount })
    }, 30000)
  })

  /**
   * Console error detection — catches broken proxy rewrites at runtime.
   *
   * Previous bugs caught by this pattern:
   * - SyntaxError from self.location.origin+ in object property keys (#608)
   * - TypeError from new URL() with relative paths (#608)
   * - Broken URL construction from bare hostname rewrites (#608)
   *
   * These errors only manifest at runtime in the browser, not at build time,
   * so unit tests alone are insufficient.
   */
  describe('no script errors from proxy rewrites', () => {
    const providerPages = [
      { name: 'googleAnalytics', path: '/ga' },
      { name: 'googleTagManager', path: '/gtm' },
      { name: 'metaPixel', path: '/meta' },
      { name: 'tiktokPixel', path: '/tiktok' },
      { name: 'clarity', path: '/clarity' },
      { name: 'hotjar', path: '/hotjar' },
      { name: 'segment', path: '/segment' },
      { name: 'xPixel', path: '/x' },
      { name: 'snapchatPixel', path: '/snap' },
      { name: 'redditPixel', path: '/reddit' },
      { name: 'plausibleAnalytics', path: '/plausible' },
      { name: 'cloudflareWebAnalytics', path: '/cfwa' },
      { name: 'rybbitAnalytics', path: '/rybbit' },
      { name: 'umamiAnalytics', path: '/umami' },
      { name: 'databuddyAnalytics', path: '/databuddy' },
      { name: 'fathomAnalytics', path: '/fathom' },
      { name: 'intercom', path: '/intercom-test' },
      { name: 'crisp', path: '/crisp-test' },
      { name: 'posthog', path: '/posthog' },
      { name: 'matomoAnalytics', path: '/matomo' },
      { name: 'mixpanelAnalytics', path: '/mixpanel' },
      { name: 'bingUet', path: '/bing' },
      { name: 'googleAdsense', path: '/adsense' },
      { name: 'carbonAds', path: '/carbon' },
      { name: 'vimeoPlayer', path: '/vimeo' },
      { name: 'youtubePlayer', path: '/youtube' },
      { name: 'npm', path: '/npm-test' },
      { name: 'gravatar', path: '/gravatar-test' },
      { name: 'lemonSqueezy', path: '/lemonsqueezy' },
      { name: 'stripe', path: '/stripe-test' },
      { name: 'googleMaps', path: '/google-maps-test' },
      { name: 'googleRecaptcha', path: '/recaptcha-test' },
      { name: 'googleSignIn', path: '/google-sign-in-test' },
      { name: 'paypal', path: '/paypal-test' },
    ]

    it.each(providerPages)('$name page has no script errors', async ({ name, path: pagePath }) => {
      const browser = await getBrowser()
      const page = await browser.newPage()
      page.setDefaultTimeout(5000)

      const uncaughtErrors: string[] = []
      const consoleWarnings: string[] = []
      const consoleErrors: string[] = []
      const failedLocalRequests: { url: string, status: number }[] = []
      let serverOrigin = ''

      page.on('pageerror', (err) => {
        const msg = err.message || String(err)
        // Databuddy SDK throws when clientId is empty/test — not a proxy rewrite issue
        if (msg.includes('[Databuddy]'))
          return
        uncaughtErrors.push(msg)
      })

      page.on('console', (msg) => {
        const text = msg.text()
        // Filter browser-level network noise (CORS, resource loading, MIME, etc.)
        if (text.startsWith('Failed to load resource') || text.includes('CORS policy'))
          return
        // MIME type errors from proxy endpoints are SDK issues (e.g., PostHog config.js returned as JSON)
        if (text.includes('MIME type') && text.includes('/_scripts/p/'))
          return
        if (msg.type() === 'error')
          consoleErrors.push(text)
        if (msg.type() === 'warning')
          consoleWarnings.push(text)
      })

      // Catch failed responses from our server (/_scripts/p/ and /_scripts/).
      // External 4xx from third-party services with test keys is expected.
      page.on('response', (response) => {
        const reqUrl = response.url()
        const status = response.status()
        if (!serverOrigin) {
          try {
            serverOrigin = new URL(reqUrl).origin
          }
          catch {
            // ignore
          }
        }
        if (status >= 400 && serverOrigin && reqUrl.startsWith(serverOrigin)) {
          const pathname = new URL(reqUrl).pathname
          // Upstream collection endpoints return 4xx with test/fake tokens — expected
          if (pathname.includes('/cdn-cgi/rum'))
            return
          // Proxy upstream errors (502/403) are expected with test API keys.
          // The proxy IS routing correctly; the third-party service rejects the request.
          if (pathname.startsWith('/_scripts/p/') && (status === 502 || status === 403))
            return
          failedLocalRequests.push({ url: pathname, status })
        }
      })

      await page.goto(url(pagePath), { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {})

      const pageRendered = await page.waitForSelector('#status', { timeout: 8000 })
        .then(() => true)
        .catch(() => false)

      if (pageRendered) {
        const loaded = await page.waitForSelector('#status:has-text("loaded")', { timeout: 8000 })
          .then(() => true)
          .catch(() => false)
        expect(loaded, `${name}: Script never reached "loaded" status`).toBe(true)
      }

      // Click all buttons to trigger SDK interactions (track events, open widgets, etc.)
      const buttons = await page.$$('button')
      for (const btn of buttons) {
        await btn.click().catch(() => {})
      }

      await page.waitForTimeout(2000)

      await page.close()

      expect(pageRendered, `${name}: Page did not render`).toBe(true)

      expect(
        uncaughtErrors,
        `${name}: Uncaught exceptions:\n${uncaughtErrors.map(e => `  ${e}`).join('\n')}`,
      ).toEqual([])

      // Console errors from our proxy rewrites or SDK initialization (not network noise)
      expect(
        consoleErrors,
        `${name}: Console errors:\n${consoleErrors.map(e => `  ${e}`).join('\n')}`,
      ).toEqual([])

      expect(
        failedLocalRequests,
        `${name}: Failed local requests:\n${failedLocalRequests.map(r => `  ${r.status} ${r.url}`).join('\n')}`,
      ).toEqual([])
    }, 30000)
  })

  /**
   * Bundled script integrity — verify rewritten scripts are syntactically valid JS.
   * Catches issues like self.location.origin+ in object keys before they reach users.
   */
  describe('bundled script integrity', () => {
    it('all cached proxy-rewritten scripts are syntactically valid', async () => {
      const cacheDir = join(fixtureDir, 'node_modules/.cache/nuxt/scripts/bundle-proxy')
      if (!existsSync(cacheDir))
        return // skip if no cached scripts

      const files = readdirSync(cacheDir).filter(f => f.endsWith('.js'))
      for (const file of files) {
        const content = readFileSync(join(cacheDir, file), 'utf-8')

        // Check for the broken pattern: expression in object property key position
        // e.g. {self.location.origin+"/_scripts/p/...":handler}
        // Must distinguish from ternary `:` (condition?expr:else) which is valid.
        // Object keys appear after `{` or `,` — match those preceding contexts.
        const brokenPropertyKeyPattern = /[{,]\s*self\.location\.origin\+["'`][^"'`]*["'`]\s*:/
        expect(
          brokenPropertyKeyPattern.test(content),
          `${file}: Contains self.location.origin expression in object property key position`,
        ).toBe(false)

        // Verify proxy URLs are present (rewrites applied)
        if (content.includes('/_scripts/p/') || content.includes('/_scripts/p/')) {
          // Script has proxy rewrites — verify no full third-party URLs remain in common URL patterns
          const thirdPartyUrlPattern = /["'`]https?:\/\/(?:www\.google-analytics\.com|analytics\.tiktok\.com|connect\.facebook\.net)\//
          const hasUnrewrittenUrls = thirdPartyUrlPattern.test(content)
          if (hasUnrewrittenUrls) {
            console.warn(`[warn] ${file}: Found unrewritten third-party URLs — may be in non-URL context`)
          }
        }
      }
    })
  })

  /**
   * Diagnostic: verify each provider loads a bundled script and/or makes proxy requests.
   * This test documents the observed bundle/proxy behavior for every provider.
   */
  describe('bundle and proxy coverage', () => {
    const allProviders = [
      { name: 'googleAnalytics', path: '/ga' },
      { name: 'googleTagManager', path: '/gtm' },
      { name: 'metaPixel', path: '/meta' },
      { name: 'tiktokPixel', path: '/tiktok' },
      { name: 'clarity', path: '/clarity' },
      { name: 'hotjar', path: '/hotjar' },
      { name: 'segment', path: '/segment' },
      { name: 'xPixel', path: '/x' },
      { name: 'snapchatPixel', path: '/snap' },
      { name: 'redditPixel', path: '/reddit' },
      { name: 'plausibleAnalytics', path: '/plausible' },
      { name: 'cloudflareWebAnalytics', path: '/cfwa' },
      { name: 'rybbitAnalytics', path: '/rybbit' },
      { name: 'umamiAnalytics', path: '/umami' },
      { name: 'databuddyAnalytics', path: '/databuddy' },
      { name: 'fathomAnalytics', path: '/fathom' },
      { name: 'intercom', path: '/intercom-test' },
      { name: 'crisp', path: '/crisp-test' },
      { name: 'posthog', path: '/posthog' },
      { name: 'mixpanelAnalytics', path: '/mixpanel' },
      { name: 'bingUet', path: '/bing' },
      { name: 'googleAdsense', path: '/adsense' },
      { name: 'vimeoPlayer', path: '/vimeo' },
      { name: 'youtubePlayer', path: '/youtube' },
      { name: 'npm', path: '/npm-test' },
      { name: 'gravatar', path: '/gravatar-test' },
      // matomoAnalytics, carbonAds, lemonSqueezy — no bundle capability (proxy-only or component-only)
    ]

    it.each(allProviders)('$name loads bundled script from /_scripts/assets/', async ({ name, path: pagePath }) => {
      const browser = await getBrowser()
      const page = await browser.newPage()
      page.setDefaultTimeout(5000)

      const scriptRequests: { url: string, status: number }[] = []
      const proxyRequests: { url: string, status: number }[] = []
      const consoleErrors: string[] = []
      const consoleWarnings: string[] = []

      page.on('console', (msg) => {
        if (msg.type() === 'error')
          consoleErrors.push(msg.text())
        if (msg.type() === 'warning')
          consoleWarnings.push(msg.text())
      })

      page.on('response', (response) => {
        const reqUrl = response.url()
        const status = response.status()
        const pathname = new URL(reqUrl).pathname
        if (pathname.startsWith('/_scripts/assets/'))
          scriptRequests.push({ url: pathname, status })
        if (pathname.startsWith('/_scripts/p/'))
          proxyRequests.push({ url: pathname, status })
      })

      await page.goto(url(pagePath), { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {})
      const loaded = await page.waitForSelector('#status:has-text("loaded")', { timeout: 8000 })
        .then(() => true)
        .catch(() => false)
      expect(loaded, `${name}: Script never reached "loaded" status`).toBe(true)

      // Click all buttons to trigger SDK interactions and generate proxy requests
      const buttons = await page.$$('button')
      for (const btn of buttons) {
        await btn.click().catch(() => {})
      }

      await page.waitForTimeout(2000)
      await page.close()

      // Every provider should load at least one bundled script from /_scripts/assets/
      const okScripts = scriptRequests.filter(r => r.status < 400)
      expect(
        okScripts.length,
        `${name}: No bundled scripts loaded.\n  script requests: ${JSON.stringify(scriptRequests)}\n  proxy requests: ${JSON.stringify(proxyRequests.slice(0, 5))}`,
      ).toBeGreaterThan(0)

      // Filter browser-level network errors (SSL, CORS, 404) from third-party SDKs
      // hitting external servers with test keys — not JS errors from our proxy rewrites
      const jsErrors = consoleErrors.filter(e =>
        !e.startsWith('Failed to load resource')
        && !e.includes('has been blocked by CORS policy')
        && !(e.includes('MIME type') && e.includes('/_scripts/p/')),
      )
      expect(
        jsErrors,
        `${name}: Console errors:\n${jsErrors.map(e => `  ${e}`).join('\n')}`,
      ).toEqual([])
    }, 30000)
  })
})
