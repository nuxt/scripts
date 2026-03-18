import { writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'
import { scriptMeta } from '../src/script-meta'

// Patterns that indicate a script measures Core Web Vitals
const CWV_PATTERNS = [
  'largest-contentful-paint',
  'layout-shift',
  'first-input',
  'getLCP',
  'getCLS',
  'getFID',
  'getINP',
  'getTTFB',
  'web-vitals',
  'webVitals',
]

interface ScriptSizeDetail {
  url: string
  transferKb: number
  decodedKb: number
  encoding: string
  durationMs: number
  initiatorType: string
  protocol: string
}

interface ScriptApis {
  // Storage / persistence
  cookies: boolean
  localStorage: boolean
  sessionStorage: boolean
  indexedDB: boolean
  // Fingerprinting
  canvas: boolean
  webgl: boolean
  audioContext: boolean
  // Device / environment
  userAgent: boolean
  hardwareConcurrency: boolean
  deviceMemory: boolean
  plugins: boolean
  languages: boolean
  screen: boolean
  // Network
  sendBeacon: boolean
  fetch: boolean
  xhr: boolean
  websocket: boolean
  // Observers
  mutationObserver: boolean
  performanceObserver: boolean
  intersectionObserver: boolean
}

interface ScriptCookie {
  name: string
  domain: string
  path: string
  httpOnly: boolean
  secure: boolean
  sameSite: string
  session: boolean
  /** Cookie lifetime in days (-1 = session) */
  lifetimeDays: number
  /** Whether this is a first-party cookie (set on the page's domain) */
  firstParty: boolean
}

interface NetworkSummary {
  /** Total number of external requests made */
  requestCount: number
  /** Unique external domains contacted */
  domains: string[]
  /** Total bytes sent to external servers (request payloads) */
  outboundBytes: number
  /** Total bytes received from external servers */
  inboundBytes: number
  /** DOM elements injected (iframes, img pixels, script tags) */
  injectedElements: { tag: string, src: string }[]
}

interface PerformanceSummary {
  /** Total main thread task time in ms (CDP TaskDuration) */
  taskDurationMs: number
  /** JS script execution time in ms (CDP ScriptDuration) */
  scriptDurationMs: number
  /** JS heap size increase in KB */
  heapDeltaKb: number
}

interface ScriptSizeEntry {
  totalTransferKb: number
  totalDecodedKb: number
  loadTimeMs: number
  collectsWebVitals: boolean
  apis: ScriptApis
  cookies: ScriptCookie[]
  network: NetworkSummary
  performance: PerformanceSummary
  scripts: ScriptSizeDetail[]
}

interface CdpResponseData {
  transferSize: number
  decodedSize: number
  encoding: string
}

// Static analysis patterns for detecting API usage in minified script source.
// Property names on browser globals survive minification, so these are reliable.
// Each key maps to patterns that indicate that API category is used.
const STATIC_API_PATTERNS: Record<keyof ScriptApis, RegExp[]> = {
  cookies: [/\.cookie\b/, /document\.cookie/],
  localStorage: [/localStorage/],
  sessionStorage: [/sessionStorage/],
  indexedDB: [/indexedDB/],
  canvas: [/\.toDataURL\b/, /\.getImageData\b/, /\.toBlob\b/],
  webgl: [/webgl/, /experimental-webgl/],
  audioContext: [/AudioContext/, /webkitAudioContext/],
  userAgent: [/userAgent/],
  hardwareConcurrency: [/hardwareConcurrency/],
  deviceMemory: [/deviceMemory/],
  plugins: [/navigator\.plugins/],
  languages: [/navigator\.languages?\b/],
  screen: [/screen\.(?:width|height|colorDepth|pixelDepth|availWidth|availHeight)\b/],
  sendBeacon: [/sendBeacon/],
  fetch: [/\.fetch\s*\(/, /\bfetch\s*\(/],
  xhr: [/XMLHttpRequest/],
  websocket: [/WebSocket/],
  mutationObserver: [/MutationObserver/],
  performanceObserver: [/PerformanceObserver/],
  intersectionObserver: [/IntersectionObserver/],
}

function detectApisFromSource(source: string): Partial<Record<keyof ScriptApis, boolean>> {
  const detected: Partial<Record<keyof ScriptApis, boolean>> = {}
  for (const [api, patterns] of Object.entries(STATIC_API_PATTERNS)) {
    if (patterns.some(p => p.test(source)))
      detected[api as keyof ScriptApis] = true
  }
  return detected
}

const EMPTY_APIS: ScriptApis = {
  cookies: false,
  localStorage: false,
  sessionStorage: false,
  indexedDB: false,
  canvas: false,
  webgl: false,
  audioContext: false,
  userAgent: false,
  hardwareConcurrency: false,
  deviceMemory: false,
  plugins: false,
  languages: false,
  screen: false,
  sendBeacon: false,
  fetch: false,
  xhr: false,
  websocket: false,
  mutationObserver: false,
  performanceObserver: false,
  intersectionObserver: false,
}

// Injected into the page before any scripts load to intercept API access
const API_INSTRUMENTATION = `
(function() {
  const a = window.__apiAccess = new Set();

  // Storage
  const cookieDesc = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
  Object.defineProperty(document, 'cookie', {
    get() { a.add('cookies'); return cookieDesc.get.call(this); },
    set(v) { a.add('cookies'); cookieDesc.set.call(this, v); },
    configurable: true
  });
  ['localStorage', 'sessionStorage'].forEach(function(prop) {
    const orig = window[prop];
    const handler = { get: function(t, p) { a.add(prop); return typeof t[p] === 'function' ? t[p].bind(t) : t[p]; } };
    try { Object.defineProperty(window, prop, { get: function() { a.add(prop); return new Proxy(orig, handler); }, configurable: true }); } catch(e) {}
  });
  const origIDB = window.indexedDB;
  try { Object.defineProperty(window, 'indexedDB', { get: function() { a.add('indexedDB'); return origIDB; }, configurable: true }); } catch(e) {}

  // Canvas fingerprinting
  const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL = function() { a.add('canvas'); return origToDataURL.apply(this, arguments); };
  const origGetImageData = CanvasRenderingContext2D.prototype.getImageData;
  CanvasRenderingContext2D.prototype.getImageData = function() { a.add('canvas'); return origGetImageData.apply(this, arguments); };
  const origGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function(type) {
    if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') a.add('webgl');
    return origGetContext.apply(this, arguments);
  };

  // AudioContext
  const OrigAC = window.AudioContext || window.webkitAudioContext;
  if (OrigAC) {
    window.AudioContext = function() { a.add('audioContext'); return new OrigAC(); };
    window.AudioContext.prototype = OrigAC.prototype;
    if (window.webkitAudioContext) window.webkitAudioContext = window.AudioContext;
  }

  // Device / environment
  ['userAgent', 'hardwareConcurrency', 'deviceMemory', 'plugins', 'languages'].forEach(function(prop) {
    const orig = Object.getOwnPropertyDescriptor(Navigator.prototype, prop) || Object.getOwnPropertyDescriptor(navigator, prop);
    if (!orig) return;
    try {
      Object.defineProperty(navigator, prop, {
        get: function() { a.add(prop); return orig.get ? orig.get.call(this) : orig.value; },
        configurable: true
      });
    } catch(e) {}
  });
  ['width', 'height', 'colorDepth', 'pixelDepth', 'availWidth', 'availHeight'].forEach(function(prop) {
    const orig = Object.getOwnPropertyDescriptor(Screen.prototype, prop);
    if (!orig) return;
    try {
      Object.defineProperty(screen, prop, {
        get: function() { a.add('screen'); return orig.get.call(this); },
        configurable: true
      });
    } catch(e) {}
  });

  // Network
  const origBeacon = navigator.sendBeacon;
  if (origBeacon) navigator.sendBeacon = function() { a.add('sendBeacon'); return origBeacon.apply(this, arguments); };
  const origFetch = window.fetch;
  window.fetch = function() { a.add('fetch'); return origFetch.apply(this, arguments); };
  const origXHR = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function() { a.add('xhr'); return origXHR.apply(this, arguments); };
  const OrigWS = window.WebSocket;
  window.WebSocket = function() { a.add('websocket'); return new OrigWS(...arguments); };
  window.WebSocket.prototype = OrigWS.prototype;

  // Observers
  const OrigMO = window.MutationObserver;
  window.MutationObserver = function() { a.add('mutationObserver'); return new OrigMO(...arguments); };
  window.MutationObserver.prototype = OrigMO.prototype;
  const OrigPO = window.PerformanceObserver;
  if (OrigPO) {
    window.PerformanceObserver = function() { a.add('performanceObserver'); return new OrigPO(...arguments); };
    window.PerformanceObserver.prototype = OrigPO.prototype;
  }
  const OrigIO = window.IntersectionObserver;
  if (OrigIO) {
    window.IntersectionObserver = function() { a.add('intersectionObserver'); return new OrigIO(...arguments); };
    window.IntersectionObserver.prototype = OrigIO.prototype;
  }


})();
`

// Secondary domains where bootstraps load their full SDK from.
// After page load, script bodies are scanned for JS URLs on these domains
// and fetched for static analysis (since lazy-loaded modules won't execute in headless).
const SECONDARY_DOMAINS: Record<string, string[]> = {
  hotjar: ['script.hotjar.com'],
  intercom: ['js.intercomcdn.com'],
  crisp: ['client.crisp.chat/static'],
}

// Some bootstraps construct secondary URLs dynamically (no plain URL in source).
// These extractors derive the URL from patterns in the bootstrap source.
const SECONDARY_URL_EXTRACTORS: Record<string, (bodies: string[]) => string[]> = {
  hotjar(bodies) {
    // Bootstrap embeds: modules.{hash}.js — construct full URL
    const allText = bodies.join(' ')
    const match = allText.match(/modules\.([a-f0-9]+)\.js/)
    return match ? [`https://script.hotjar.com/modules.${match[1]}.js`] : []
  },
  crisp(bodies) {
    // Bootstrap pattern: this.h="db1a904", loads client_default_{hash}.js
    const allText = bodies.join(' ')
    const match = allText.match(/this\.h="([a-f0-9]+)"/)
    return match ? [`https://client.crisp.chat/static/javascripts/client_default_${match[1]}.js`] : []
  },
}

const SECONDARY_URL_RE = /https?:\/\/[^"'\s]+\.js/g

async function fetchSecondaryBodies(key: string, existingBodies: string[]): Promise<string[]> {
  const domains = SECONDARY_DOMAINS[key]
  if (!domains)
    return []

  // Extract JS URLs from existing bodies that match secondary domains
  const allText = existingBodies.join(' ')
  const urls = new Set<string>()
  for (const match of allText.matchAll(SECONDARY_URL_RE)) {
    const url = match[0]
    if (domains.some(d => url.includes(d)))
      urls.add(url)
  }

  // Try dynamic URL extractors for scripts that construct URLs at runtime
  const extractor = SECONDARY_URL_EXTRACTORS[key]
  if (extractor) {
    for (const url of extractor(existingBodies))
      urls.add(url)
  }

  const fetched: string[] = []
  for (const url of urls) {
    try {
      const res = await fetch(url)
      if (res.ok) {
        const body = await res.text()
        fetched.push(body)
        console.log(`  📦 Secondary: ${url} (${Math.round(body.length / 1024)}KB)`)
      }
    }
    catch {}
  }
  return fetched
}

function round(bytes: number): number {
  return Number.parseFloat((bytes / 1024).toFixed(1))
}

// clientInit templates — ${ID} is replaced with meta.testId at build time.
// These set up the global queue functions so bootstraps load their full SDK payloads.
const CLIENT_INIT: Record<string, string> = {
  metaPixel: `
    var fbq = window.fbq = function() { fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments) };
    window._fbq = fbq; fbq.push = fbq; fbq.loaded = true; fbq.version = '2.0'; fbq.queue = [];
    fbq('init', '\${ID}'); fbq('track', 'PageView');`,
  tiktokPixel: `
    window.TiktokAnalyticsObject = 'ttq';
    var ttq = window.ttq = function() { ttq.callMethod ? ttq.callMethod.apply(ttq, arguments) : ttq.queue.push(arguments) };
    ttq.push = ttq; ttq.loaded = true; ttq.queue = [];
    ttq('init', '\${ID}'); ttq('page');`,
  redditPixel: `
    var rdt = function() { rdt.sendEvent ? rdt.sendEvent(rdt, arguments) : rdt.callQueue.push(arguments) };
    rdt.callQueue = []; window.rdt = rdt;
    rdt('init', '\${ID}'); rdt('track', 'PageVisit');`,
  xPixel: `
    var s = window.twq = function() { s.exe ? s.exe(s, arguments) : s.queue.push(arguments) };
    s.version = '1.1'; s.queue = [['config', '\${ID}']];`,
  clarity: `
    window.clarity = window.clarity || function() { (window.clarity.q = window.clarity.q || []).push(arguments) };`,
  hotjar: `
    window._hjSettings = { hjid: \${ID}, hjsv: 6 };
    window.hj = window.hj || function() { (window.hj.q = window.hj.q || []).push(arguments) };`,
  snapchatPixel: `
    var snaptr = window.snaptr = function() { snaptr.handleRequest ? snaptr.handleRequest.apply(snaptr, arguments) : snaptr.queue.push(arguments) };
    window._snaptr = snaptr; snaptr.push = snaptr; snaptr.loaded = true; snaptr.version = '1.0'; snaptr.queue = [];
    snaptr('init', '\${ID}', {});`,
  googleAnalytics: `
    window.dataLayer = window.dataLayer || [];
    window.gtag = function() { window.dataLayer.push(arguments) };
    window.gtag('js', new Date()); window.gtag('config', '\${ID}');`,
  googleTagManager: `
    window.dataLayer = window.dataLayer || [];
    window.gtag = function() { window.dataLayer.push(arguments) };
    window.dataLayer.push({ 'gtm.start': Date.now(), 'event': 'gtm.js' });`,
  segment: `
    var analytics = window.analytics = window.analytics || [];
    analytics.methods = ['identify','group','track','page','pageview','alias','ready','on','once','off','trackLink','trackForm','trackClick','trackSubmit'];
    analytics.factory = function(e) { return function() { var t = Array.prototype.slice.call(arguments); t.unshift(e); analytics.push(t); return analytics; } };
    for (var i = 0; i < analytics.methods.length; i++) { analytics[analytics.methods[i]] = analytics.factory(analytics.methods[i]); }
    analytics.page();`,
  matomoAnalytics: `
    var _paq = window._paq = window._paq || [];
    _paq.push(['setSiteId', '1']);
    _paq.push(['trackPageView']);`,
  intercom: `
    window.intercomSettings = { app_id: '\${ID}' };`,
  crisp: `
    window.$crisp = [];
    window.CRISP_WEBSITE_ID = '\${ID}';`,
  plausibleAnalytics: `
    window.plausible = window.plausible || function() { (window.plausible.q = window.plausible.q || []).push(arguments) };
    window.plausible.init = window.plausible.init || function(i) { window.plausible.o = i || {} };`,
  googleMaps: `
    window.google = window.google || {};
    window.google.maps = window.google.maps || {};`,
  youtubePlayer: `
    window.onYouTubeIframeAPIReady = function() {};`,
  vercelAnalytics: `
    window.va = function() { (window.vaq = window.vaq || []).push(arguments) };
    window.vam = 'production';`,
  databuddyAnalytics: `
    window.databuddyConfig = { clientId: 'test' };`,
  googleRecaptcha: `
    window.grecaptcha = window.grecaptcha || {};
    window.grecaptcha.ready = window.grecaptcha.ready || function(cb) {
      (window.___grecaptcha_cfg = window.___grecaptcha_cfg || {}).fns = [].concat(window.___grecaptcha_cfg.fns || [], [cb]);
    };`,
  googleSignIn: `
    window.google = window.google || {};
    window.google.accounts = window.google.accounts || {};
    window.google.accounts.id = window.google.accounts.id || {};`,
}

function buildHtml(key: string, meta: { urls: string[], testId?: string | number }): string {
  let init = CLIENT_INIT[key] || ''
  if (init && meta.testId !== undefined)
    init = init.replaceAll('${ID}', String(meta.testId))
  const initTag = init ? `<script>${init}</script>` : ''
  const scripts = meta.urls.map(u => `<script src="${u}"></script>`).join('\n')
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${initTag}\n${scripts}</body></html>`
}

function startServer(): Promise<{ port: number, close: () => void }> {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const key = req.url?.slice(1) || ''
      const meta = scriptMeta[key]
      if (!meta || meta.urls.length === 0) {
        res.writeHead(404)
        res.end('Not found')
        return
      }
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end(buildHtml(key, meta))
    })
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address()
      const port = typeof addr === 'object' && addr ? addr.port : 0
      resolve({ port, close: () => server.close() })
    })
  })
}

const EMPTY_PERF: PerformanceSummary = { taskDurationMs: 0, scriptDurationMs: 0, heapDeltaKb: 0 }

async function main() {
  const { port, close } = await startServer()
  console.log(`Server listening on http://127.0.0.1:${port}`)

  const browser = await chromium.launch({ headless: true })
  const sizes: Record<string, ScriptSizeEntry> = {}

  for (const [key, meta] of Object.entries(scriptMeta)) {
    if (meta.urls.length === 0) {
      console.log(`${key}: no URLs, skipping`)
      sizes[key] = { totalTransferKb: 0, totalDecodedKb: 0, loadTimeMs: 0, collectsWebVitals: false, apis: { ...EMPTY_APIS }, cookies: [], network: { requestCount: 0, domains: [], outboundBytes: 0, inboundBytes: 0, injectedElements: [] }, performance: EMPTY_PERF, scripts: [] }
      continue
    }

    console.log(`${key}: measuring ${meta.urls.length} URL(s)...`)
    const page = await browser.newPage()

    // Inject API instrumentation before any scripts load
    await page.addInitScript(API_INSTRUMENTATION)

    // Collect CDP response data for CORS-blocked transferSize/decodedSize fallback
    const cdpData = new Map<string, CdpResponseData>()
    const scriptBodies: string[] = []
    const cdpSession = await page.context().newCDPSession(page)
    await cdpSession.send('Network.enable')
    await cdpSession.send('Performance.enable')

    const requestIdToUrl = new Map<string, string>()
    const externalDomains = new Set<string>()
    let externalRequestCount = 0
    let outboundBytes = 0
    let inboundBytes = 0

    cdpSession.on('Network.requestWillBeSent', (event) => {
      requestIdToUrl.set(event.requestId, event.request.url)
      const url = event.request.url
      if (!url.startsWith('http://127.0.0.1') && !url.startsWith('data:')) {
        externalRequestCount++
        try { externalDomains.add(new URL(url).hostname) }
        catch {}
        // Track outbound payload size (POST body, beacon data)
        if (event.request.postData)
          outboundBytes += Buffer.byteLength(event.request.postData, 'utf8')
      }
    })

    cdpSession.on('Network.responseReceived', (event) => {
      const url = event.response.url
      if (url.startsWith('http://127.0.0.1'))
        return
      const headers = event.response.headers
      const encoding = headers['content-encoding'] || headers['Content-Encoding'] || 'none'
      cdpData.set(url, {
        transferSize: 0,
        decodedSize: 0,
        encoding,
      })
    })

    cdpSession.on('Network.loadingFinished', (event) => {
      const url = requestIdToUrl.get(event.requestId)
      if (url && !url.startsWith('http://127.0.0.1') && event.encodedDataLength > 0)
        inboundBytes += event.encodedDataLength
      if (!url || !cdpData.has(url))
        return
      const entry = cdpData.get(url)!
      if (event.encodedDataLength > 0)
        entry.transferSize = event.encodedDataLength
      // Fetch decoded body size via CDP
      cdpSession.send('Network.getResponseBody', { requestId: event.requestId })
        .then(({ body, base64Encoded }) => {
          entry.decodedSize = base64Encoded
            ? Math.ceil(body.length * 3 / 4) // base64 → byte estimate
            : Buffer.byteLength(body, 'utf8')
          if (!base64Encoded)
            scriptBodies.push(body)
        })
        .catch(() => {}) // Some responses may be unavailable
    })

    // Snapshot cookies, heap, and performance metrics before script load
    const { cookies: cookiesBefore } = await cdpSession.send('Network.getAllCookies') as { cookies: any[] }
    const cookieKeysBefore = new Set(cookiesBefore.map((c: any) => `${c.name}|${c.domain}`))
    const heapBefore = await cdpSession.send('Runtime.getHeapUsage') as { usedSize: number }
    const perfBefore = await cdpSession.send('Performance.getMetrics') as { metrics: { name: string, value: number }[] }
    const getMetric = (metrics: { name: string, value: number }[], name: string) => metrics.find(m => m.name === name)?.value ?? 0

    await page.goto(`http://127.0.0.1:${port}/${key}`, { waitUntil: 'networkidle', timeout: 30_000 })
      .catch((err) => {
        console.warn(`  [timeout] ${key}: ${err.message}`)
      })

    // Wait for async CDP getResponseBody calls to settle
    await new Promise(r => setTimeout(r, 200))

    // Collect Performance API entries
    const perfEntries = await page.evaluate(() => {
      return performance.getEntriesByType('resource').map((e) => {
        const r = e as PerformanceResourceTiming
        return {
          name: r.name,
          transferSize: r.transferSize,
          decodedBodySize: r.decodedBodySize,
          duration: r.duration,
          initiatorType: r.initiatorType,
          nextHopProtocol: r.nextHopProtocol,
        }
      })
    })

    const scripts: ScriptSizeDetail[] = []
    let maxDuration = 0

    for (const entry of perfEntries) {
      // Skip localhost resources
      if (entry.name.startsWith('http://127.0.0.1'))
        continue

      const cdpEntry = cdpData.get(entry.name)

      // Prefer Performance API, fall back to CDP for CORS-blocked entries
      const transferBytes = entry.transferSize > 0 ? entry.transferSize : (cdpEntry?.transferSize ?? 0)
      const decodedBytes = entry.decodedBodySize > 0 ? entry.decodedBodySize : (cdpEntry?.decodedSize ?? transferBytes)
      const encoding = cdpEntry?.encoding ?? 'none'

      if (transferBytes === 0 && decodedBytes === 0)
        continue

      const detail: ScriptSizeDetail = {
        url: entry.name,
        transferKb: round(transferBytes),
        decodedKb: round(decodedBytes),
        encoding,
        durationMs: Math.round(entry.duration),
        initiatorType: entry.initiatorType,
        protocol: entry.nextHopProtocol || 'unknown',
      }

      scripts.push(detail)
      if (entry.duration > maxDuration)
        maxDuration = entry.duration

      console.log(`  ${detail.url} → ${detail.transferKb}KB transfer, ${detail.decodedKb}KB decoded, ${encoding}, ${detail.durationMs}ms`)
    }

    let totalTransfer = 0
    let totalDecoded = 0
    for (const s of scripts) {
      totalTransfer += s.transferKb
      totalDecoded += s.decodedKb
    }

    // Fetch secondary SDK modules that bootstraps reference but don't load in headless
    const secondaryBodies = await fetchSecondaryBodies(key, scriptBodies)
    scriptBodies.push(...secondaryBodies)

    const allBodies = scriptBodies.join(' ')
    const collectsWebVitals = CWV_PATTERNS.some(p => allBodies.includes(p))
    if (collectsWebVitals)
      console.log(`  ⚡ Collects Web Vitals`)

    // Detect APIs: merge runtime instrumentation + static source analysis
    const accessedApis = await page.evaluate(() => [...(window as any).__apiAccess || []])
    const apis: ScriptApis = { ...EMPTY_APIS }
    // Runtime detection
    for (const api of accessedApis) {
      if (api in apis)
        (apis as Record<string, boolean>)[api] = true
    }
    // Static source analysis (catches APIs in bootstrap scripts that don't fully init)
    const staticApis = detectApisFromSource(allBodies)
    for (const [api, detected] of Object.entries(staticApis)) {
      if (detected)
        (apis as Record<string, boolean>)[api] = true
    }
    const usedApis = Object.entries(apis).filter(([, v]) => v).map(([k]) => k).sort()
    if (usedApis.length)
      console.log(`  🔍 APIs: ${usedApis.join(', ')}`)

    // Collect cookies set by the script (diff against pre-load snapshot)
    const { cookies: cookiesAfter } = await cdpSession.send('Network.getAllCookies') as { cookies: any[] }
    const scriptCookies: ScriptCookie[] = cookiesAfter
      .filter((c: any) => !cookieKeysBefore.has(`${c.name}|${c.domain}`))
      .filter((c: any) => !c.domain.includes('127.0.0.1')) // skip localhost cookies
      .map((c: any) => ({
        name: c.name,
        domain: c.domain,
        path: c.path,
        httpOnly: c.httpOnly,
        secure: c.secure,
        sameSite: c.sameSite || 'None',
        session: c.session,
        lifetimeDays: c.expires > 0 ? Math.round((c.expires - Date.now() / 1000) / 86400) : -1,
        firstParty: c.domain === '127.0.0.1' || c.domain === 'localhost',
      }))
    if (scriptCookies.length)
      console.log(`  🍪 Cookies: ${scriptCookies.map(c => `${c.name} (${c.domain}, ${c.lifetimeDays}d)`).join(', ')}`)

    // Performance: script execution time + task duration + heap delta
    const perfAfter = await cdpSession.send('Performance.getMetrics') as { metrics: { name: string, value: number }[] }
    const taskDurationMs = Math.round((getMetric(perfAfter.metrics, 'TaskDuration') - getMetric(perfBefore.metrics, 'TaskDuration')) * 1000)
    const scriptDurationMs = Math.round((getMetric(perfAfter.metrics, 'ScriptDuration') - getMetric(perfBefore.metrics, 'ScriptDuration')) * 1000)
    const heapAfter = await cdpSession.send('Runtime.getHeapUsage') as { usedSize: number }
    const heapDeltaKb = Math.round((heapAfter.usedSize - heapBefore.usedSize) / 1024)

    // Injected DOM elements (iframes, img pixels, dynamically added scripts)
    // Filter out the original script tags we put in our HTML template
    const originalUrls = meta.urls
    const injectedElements = await page.evaluate((origUrls: string[]) => {
      const els: { tag: string, src: string }[] = []
      for (const el of document.querySelectorAll('iframe[src], img[src], script[src]')) {
        const src = el.getAttribute('src') || ''
        if (src && !src.startsWith('http://127.0.0.1') && !src.startsWith('data:') && !origUrls.includes(src))
          els.push({ tag: el.tagName.toLowerCase(), src })
      }
      return els
    }, originalUrls)

    const network: NetworkSummary = {
      requestCount: externalRequestCount,
      domains: [...externalDomains].sort(),
      outboundBytes,
      inboundBytes,
      injectedElements,
    }
    const perf: PerformanceSummary = {
      taskDurationMs,
      scriptDurationMs,
      heapDeltaKb,
    }

    if (externalRequestCount > 0)
      console.log(`  📡 Network: ${externalRequestCount} requests, ${network.domains.length} domains, ${Math.round(outboundBytes / 1024)}KB out, ${Math.round(inboundBytes / 1024)}KB in`)
    if (scriptDurationMs > 0)
      console.log(`  ⏱️  Performance: ${scriptDurationMs}ms script, ${taskDurationMs}ms task, ${heapDeltaKb > 0 ? `+${heapDeltaKb}KB heap` : ''}`)
    if (injectedElements.length > 0)
      console.log(`  🧩 Injected: ${injectedElements.map(e => `<${e.tag}>`).join(', ')}`)

    sizes[key] = {
      totalTransferKb: Number.parseFloat(totalTransfer.toFixed(1)),
      totalDecodedKb: Number.parseFloat(totalDecoded.toFixed(1)),
      loadTimeMs: Math.round(maxDuration),
      collectsWebVitals,
      apis,
      cookies: scriptCookies,
      network,
      performance: perf,
      scripts,
    }

    await page.close()

    // Small delay between providers to avoid rate limiting
    await new Promise(r => setTimeout(r, 500))
  }

  await browser.close()
  close()

  const outPath = resolve(import.meta.dirname, '../src/script-sizes.json')
  writeFileSync(outPath, `${JSON.stringify(sizes, null, 2)}\n`)
  console.log(`\nWrote ${outPath}`)
}

main()
