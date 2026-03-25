import type { CDPSession } from 'playwright-core'
import { writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { resolve } from 'node:path'
import { parseAndWalk } from 'oxc-walker'
import { chromium } from 'playwright-core'
import { scriptMeta } from '../packages/script/src/script-meta'

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
  doNotTrack: boolean
  hardwareConcurrency: boolean
  deviceMemory: boolean
  plugins: boolean
  languages: boolean
  screen: boolean
  // Fingerprinting — additional signals
  timezone: boolean
  platform: boolean
  vendor: boolean
  connection: boolean
  maxTouchPoints: boolean
  devicePixelRatio: boolean
  mediaDevices: boolean
  getBattery: boolean
  // Tracking
  referrer: boolean
  windowName: boolean
  rtcPeerConnection: boolean
  geolocation: boolean
  serviceWorker: boolean
  cacheApi: boolean
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

// Navigator property → API category mapping for AST member expression detection
const NAVIGATOR_PROPS: Record<string, keyof ScriptApis> = {
  userAgent: 'userAgent',
  doNotTrack: 'doNotTrack',
  hardwareConcurrency: 'hardwareConcurrency',
  deviceMemory: 'deviceMemory',
  plugins: 'plugins',
  languages: 'languages',
  language: 'languages',
  platform: 'platform',
  vendor: 'vendor',
  connection: 'connection',
  maxTouchPoints: 'maxTouchPoints',
  mediaDevices: 'mediaDevices',
  geolocation: 'geolocation',
  serviceWorker: 'serviceWorker',
  getBattery: 'getBattery',
  sendBeacon: 'sendBeacon',
}

// Screen property → API category
const SCREEN_PROPS = new Set(['width', 'height', 'colorDepth', 'pixelDepth', 'availWidth', 'availHeight'])

// Global identifiers that map directly to an API category
const GLOBAL_IDENTIFIERS: Record<string, keyof ScriptApis> = {
  localStorage: 'localStorage',
  sessionStorage: 'sessionStorage',
  indexedDB: 'indexedDB',
  AudioContext: 'audioContext',
  webkitAudioContext: 'audioContext',
  RTCPeerConnection: 'rtcPeerConnection',
  webkitRTCPeerConnection: 'rtcPeerConnection',
  XMLHttpRequest: 'xhr',
  WebSocket: 'websocket',
  MutationObserver: 'mutationObserver',
  PerformanceObserver: 'performanceObserver',
  IntersectionObserver: 'intersectionObserver',
  CacheStorage: 'cacheApi',
}

// Member expression property names that indicate API usage regardless of object
const PROPERTY_SIGNALS: Record<string, keyof ScriptApis> = {
  toDataURL: 'canvas',
  getImageData: 'canvas',
  toBlob: 'canvas',
  enumerateDevices: 'mediaDevices',
  getTimezoneOffset: 'timezone',
  effectiveType: 'connection',
  downlink: 'connection',
  rtt: 'connection',
  sendBeacon: 'sendBeacon',
}

// String literals that indicate API usage (for getContext('webgl') etc.)
const STRING_SIGNALS: Record<string, keyof ScriptApis> = {
  'webgl': 'webgl',
  'webgl2': 'webgl',
  'experimental-webgl': 'webgl',
}

// Regex fallbacks used when AST parsing fails (invalid JS, wasm, etc.)
const REGEX_FALLBACKS: [RegExp, keyof ScriptApis][] = [
  [/userAgent/, 'userAgent'],
  [/\.cookie\b/, 'cookies'],
  [/localStorage/, 'localStorage'],
  [/sessionStorage/, 'sessionStorage'],
  [/hardwareConcurrency/, 'hardwareConcurrency'],
  [/deviceMemory/, 'deviceMemory'],
  [/navigator\.plugins/, 'plugins'],
  [/navigator\.languages?\b/, 'languages'],
  [/screen\.(?:width|height|colorDepth|pixelDepth)/, 'screen'],
  [/getTimezoneOffset|DateTimeFormat/, 'timezone'],
  [/navigator\.platform/, 'platform'],
  [/navigator\.vendor/, 'vendor'],
  [/maxTouchPoints/, 'maxTouchPoints'],
  [/devicePixelRatio/, 'devicePixelRatio'],
  [/getBattery/, 'getBattery'],
  [/document\.referrer/, 'referrer'],
  [/RTCPeerConnection/, 'rtcPeerConnection'],
  [/geolocation/, 'geolocation'],
  [/sendBeacon/, 'sendBeacon'],
  [/\bfetch\s*\(/, 'fetch'],
  [/XMLHttpRequest/, 'xhr'],
  [/WebSocket/, 'websocket'],
  [/MutationObserver/, 'mutationObserver'],
  [/PerformanceObserver/, 'performanceObserver'],
  [/IntersectionObserver/, 'intersectionObserver'],
  [/AudioContext/, 'audioContext'],
  [/\.toDataURL\b/, 'canvas'],
  [/webgl/, 'webgl'],
  [/mediaDevices|enumerateDevices/, 'mediaDevices'],
  [/window\.name\b/, 'windowName'],
  [/indexedDB/, 'indexedDB'],
  [/serviceWorker/, 'serviceWorker'],
  [/caches\.open|CacheStorage/, 'cacheApi'],
  [/navigator\.connection|\.effectiveType|\.downlink\b/, 'connection'],
  [/doNotTrack/, 'doNotTrack'],
]

function detectApisFromSourceAst(source: string, filename: string): Partial<Record<keyof ScriptApis, boolean>> {
  const detected: Partial<Record<keyof ScriptApis, boolean>> = {}
  const mark = (api: keyof ScriptApis) => {
    detected[api] = true
  }

  try {
    parseAndWalk(source, filename, (node) => {
      // MemberExpression: navigator.userAgent, screen.width, document.cookie, window.name, etc.
      if (node.type === 'MemberExpression') {
        const obj = (node as any).object
        const prop = (node as any).property
        const propName = prop?.type === 'Identifier' ? prop.name : prop?.type === 'Literal' ? prop.value : null
        if (!propName)
          return

        // navigator.* properties
        if (obj?.type === 'Identifier' && obj.name === 'navigator' && NAVIGATOR_PROPS[propName])
          mark(NAVIGATOR_PROPS[propName])

        // screen.width, screen.height, etc.
        if (obj?.type === 'Identifier' && obj.name === 'screen' && SCREEN_PROPS.has(propName))
          mark('screen')

        // document.cookie, document.referrer
        if (obj?.type === 'Identifier' && obj.name === 'document') {
          if (propName === 'cookie')
            mark('cookies')
          if (propName === 'referrer')
            mark('referrer')
        }

        // window.name, window.fetch, window.devicePixelRatio, window.localStorage, etc.
        if (obj?.type === 'Identifier' && (obj.name === 'window' || obj.name === 'self' || obj.name === 'globalThis')) {
          if (propName === 'name')
            mark('windowName')
          if (propName === 'devicePixelRatio')
            mark('devicePixelRatio')
          if (propName === 'doNotTrack')
            mark('doNotTrack')
          if (GLOBAL_IDENTIFIERS[propName])
            mark(GLOBAL_IDENTIFIERS[propName])
        }

        // Nested: window.navigator.userAgent, self.navigator.platform, etc.
        if (obj?.type === 'MemberExpression') {
          const innerObj = obj.object
          const innerProp = obj.property
          const innerPropName = innerProp?.type === 'Identifier' ? innerProp.name : null
          if (innerPropName === 'navigator' && NAVIGATOR_PROPS[propName])
            mark(NAVIGATOR_PROPS[propName])
          if (innerPropName === 'screen' && SCREEN_PROPS.has(propName))
            mark('screen')
          if (innerPropName === 'document') {
            if (propName === 'cookie')
              mark('cookies')
            if (propName === 'referrer')
              mark('referrer')
          }
          // navigator.mediaDevices.enumerateDevices
          if (innerObj?.type === 'Identifier' && innerObj.name === 'navigator' && innerPropName === 'mediaDevices')
            mark('mediaDevices')
        }

        // Property-based signals: .toDataURL(), .getImageData(), .enumerateDevices(), etc.
        if (PROPERTY_SIGNALS[propName])
          mark(PROPERTY_SIGNALS[propName])

        // caches.open
        if (obj?.type === 'Identifier' && obj.name === 'caches' && propName === 'open')
          mark('cacheApi')
      }

      // Identifier: bare global references (localStorage, XMLHttpRequest, WebSocket, etc.)
      if (node.type === 'Identifier') {
        const name = (node as any).name
        if (GLOBAL_IDENTIFIERS[name])
          mark(GLOBAL_IDENTIFIERS[name])
        if (name === 'devicePixelRatio')
          mark('devicePixelRatio')
      }

      // CallExpression: fetch(), Intl.DateTimeFormat(), navigator.geolocation.getCurrentPosition(), etc.
      if (node.type === 'CallExpression') {
        const callee = (node as any).callee
        // bare fetch()
        if (callee?.type === 'Identifier' && callee.name === 'fetch')
          mark('fetch')
        // *.fetch()
        if (callee?.type === 'MemberExpression') {
          const cProp = callee.property
          const cPropName = cProp?.type === 'Identifier' ? cProp.name : null
          if (cPropName === 'fetch')
            mark('fetch')
        }
      }

      // NewExpression: new AudioContext(), new RTCPeerConnection(), new WebSocket(), etc.
      if (node.type === 'NewExpression') {
        const callee = (node as any).callee
        if (callee?.type === 'Identifier' && GLOBAL_IDENTIFIERS[callee.name])
          mark(GLOBAL_IDENTIFIERS[callee.name])
        // new Intl.DateTimeFormat()
        if (callee?.type === 'MemberExpression') {
          const obj = callee.object
          const prop = callee.property
          if (obj?.type === 'Identifier' && obj.name === 'Intl' && prop?.type === 'Identifier' && prop.name === 'DateTimeFormat')
            mark('timezone')
        }
      }

      // String literals: getContext('webgl'), 'experimental-webgl', etc.
      if (node.type === 'Literal') {
        const value = (node as any).value
        if (typeof value === 'string' && STRING_SIGNALS[value])
          mark(STRING_SIGNALS[value])
        // Also catch '.timeZone' access in strings (some scripts use bracket notation)
        if (typeof value === 'string' && value === 'timeZone')
          mark('timezone')
      }
    })
  }
  catch {
    // If AST parsing fails (invalid JS, wasm, etc.), fall back to regex for critical patterns
    console.warn(`  ⚠️  AST parse failed for ${filename}, using regex fallback`)
    for (const [pattern, api] of REGEX_FALLBACKS) {
      if (pattern.test(source))
        detected[api] = true
    }
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
  doNotTrack: false,
  hardwareConcurrency: false,
  deviceMemory: false,
  plugins: false,
  languages: false,
  screen: false,
  timezone: false,
  platform: false,
  vendor: false,
  connection: false,
  maxTouchPoints: false,
  devicePixelRatio: false,
  mediaDevices: false,
  getBattery: false,
  referrer: false,
  windowName: false,
  rtcPeerConnection: false,
  geolocation: false,
  serviceWorker: false,
  cacheApi: false,
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
  ['userAgent', 'doNotTrack', 'hardwareConcurrency', 'deviceMemory', 'plugins', 'languages', 'platform', 'vendor', 'connection', 'maxTouchPoints'].forEach(function(prop) {
    const orig = Object.getOwnPropertyDescriptor(Navigator.prototype, prop) || Object.getOwnPropertyDescriptor(navigator, prop);
    if (!orig) return;
    try {
      Object.defineProperty(navigator, prop, {
        get: function() { a.add(prop); return orig.get ? orig.get.call(this) : orig.value; },
        configurable: true
      });
    } catch(e) {}
  });
  // window.doNotTrack (non-standard, used by some privacy scripts)
  if ('doNotTrack' in window) {
    const origDNT = Object.getOwnPropertyDescriptor(window, 'doNotTrack');
    if (origDNT) {
      try {
        Object.defineProperty(window, 'doNotTrack', {
          get: function() { a.add('doNotTrack'); return origDNT.get ? origDNT.get.call(this) : origDNT.value; },
          configurable: true
        });
      } catch(e) {}
    }
  }
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

  // devicePixelRatio
  const origDPR = Object.getOwnPropertyDescriptor(window, 'devicePixelRatio');
  if (origDPR) {
    try {
      Object.defineProperty(window, 'devicePixelRatio', {
        get: function() { a.add('devicePixelRatio'); return origDPR.get ? origDPR.get.call(this) : origDPR.value; },
        configurable: true
      });
    } catch(e) {}
  }

  // Timezone (Intl.DateTimeFormat)
  const origDTF = Intl.DateTimeFormat;
  Intl.DateTimeFormat = function() { a.add('timezone'); return new origDTF(...arguments); };
  Intl.DateTimeFormat.prototype = origDTF.prototype;
  Intl.DateTimeFormat.supportedLocalesOf = origDTF.supportedLocalesOf;
  const origGTZO = Date.prototype.getTimezoneOffset;
  Date.prototype.getTimezoneOffset = function() { a.add('timezone'); return origGTZO.call(this); };

  // navigator.getBattery
  if (navigator.getBattery) {
    const origBat = navigator.getBattery;
    navigator.getBattery = function() { a.add('getBattery'); return origBat.call(this); };
  }

  // navigator.mediaDevices
  if (navigator.mediaDevices) {
    const origED = navigator.mediaDevices.enumerateDevices;
    if (origED) navigator.mediaDevices.enumerateDevices = function() { a.add('mediaDevices'); return origED.call(this); };
  }

  // navigator.geolocation
  if (navigator.geolocation) {
    const origGCP = navigator.geolocation.getCurrentPosition;
    const origWP = navigator.geolocation.watchPosition;
    navigator.geolocation.getCurrentPosition = function() { a.add('geolocation'); return origGCP.apply(this, arguments); };
    navigator.geolocation.watchPosition = function() { a.add('geolocation'); return origWP.apply(this, arguments); };
  }

  // document.referrer
  const origRef = Object.getOwnPropertyDescriptor(Document.prototype, 'referrer');
  if (origRef) {
    try {
      Object.defineProperty(document, 'referrer', {
        get: function() { a.add('referrer'); return origRef.get.call(this); },
        configurable: true
      });
    } catch(e) {}
  }

  // window.name
  const origWN = Object.getOwnPropertyDescriptor(window, 'name') || { get: function() { return ''; }, set: function() {} };
  try {
    Object.defineProperty(window, 'name', {
      get: function() { a.add('windowName'); return origWN.get ? origWN.get.call(this) : origWN.value; },
      set: function(v) { a.add('windowName'); if (origWN.set) origWN.set.call(this, v); },
      configurable: true
    });
  } catch(e) {}

  // RTCPeerConnection
  const OrigRTC = window.RTCPeerConnection || window.webkitRTCPeerConnection;
  if (OrigRTC) {
    window.RTCPeerConnection = function() { a.add('rtcPeerConnection'); return new OrigRTC(...arguments); };
    window.RTCPeerConnection.prototype = OrigRTC.prototype;
    if (window.webkitRTCPeerConnection) window.webkitRTCPeerConnection = window.RTCPeerConnection;
  }

  // Service Worker
  if (navigator.serviceWorker) {
    const origSW = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker') || Object.getOwnPropertyDescriptor(Navigator.prototype, 'serviceWorker');
    if (origSW) {
      try {
        Object.defineProperty(navigator, 'serviceWorker', {
          get: function() { a.add('serviceWorker'); return origSW.get ? origSW.get.call(this) : origSW.value; },
          configurable: true
        });
      } catch(e) {}
    }
  }

  // Cache API
  if (window.caches) {
    const origCO = window.caches.open;
    window.caches.open = function() { a.add('cacheApi'); return origCO.apply(this, arguments); };
  }

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

  // Track off-DOM image pixels (new Image().src = url)
  window.__trackingPixels = [];
  const OrigImage = window.Image;
  window.Image = function(w, h) {
    const img = new OrigImage(w, h);
    const origSrcDesc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
    Object.defineProperty(img, 'src', {
      get: function() { return origSrcDesc.get.call(this); },
      set: function(v) {
        if (v && typeof v === 'string' && v.startsWith('http') && !v.startsWith('http://127.0.0.1'))
          window.__trackingPixels.push(v);
        origSrcDesc.set.call(this, v);
      },
      configurable: true
    });
    return img;
  };
  window.Image.prototype = OrigImage.prototype;

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

// Some bootstraps construct secondary URLs dynamically (no plain URL in source).
// These extractors derive the URL from patterns in the bootstrap source.
const HOTJAR_MODULE_RE = /modules\.([a-f0-9]+)\.js/
const CRISP_HASH_RE = /this\.h="([a-f0-9]+)"/
const INTERCOM_VENDOR_RE = /vendor-modern\.([a-f0-9]+)\.js/
const INTERCOM_FRAME_RE = /frame-modern\.([a-f0-9]+)\.js/

const SECONDARY_URL_EXTRACTORS: Record<string, (bodies: string[]) => string[]> = {
  hotjar(bodies) {
    const allText = bodies.join(' ')
    const match = HOTJAR_MODULE_RE.exec(allText)
    return match ? [`https://script.hotjar.com/modules.${match[1]}.js`] : []
  },
  crisp(bodies) {
    const allText = bodies.join(' ')
    const match = CRISP_HASH_RE.exec(allText)
    return match ? [`https://client.crisp.chat/static/javascripts/client_default_${match[1]}.js`] : []
  },
  intercom(bodies) {
    const allText = bodies.join(' ')
    const urls: string[] = []
    const vendor = INTERCOM_VENDOR_RE.exec(allText)
    if (vendor)
      urls.push(`https://js.intercomcdn.com/vendor-modern.${vendor[1]}.js`)
    const frame = INTERCOM_FRAME_RE.exec(allText)
    if (frame)
      urls.push(`https://js.intercomcdn.com/frame-modern.${frame[1]}.js`)
    return urls
  },
}

const SECONDARY_URL_RE = /https?:\/\/[^"'\s]+\.js(?:\?[^"'\s]*)?/g

interface SecondaryResult {
  bodies: string[]
  scripts: ScriptSizeDetail[]
}

// Fetch JS URLs referenced in script bodies from domains already seen in the network waterfall.
// This avoids fetching random URLs mentioned in comments/strings (e.g. soundcloud in matomo).
async function fetchSecondaryScripts(key: string, existingBodies: string[], alreadyLoadedUrls: Set<string>, knownDomains: Set<string>): Promise<SecondaryResult> {
  const allText = existingBodies.join(' ')
  const urls = new Set<string>()

  // Build set of known base domains (e.g. paypal.com from www.paypal.com)
  const baseDomains = new Set<string>()
  for (const d of knownDomains) {
    const parts = d.split('.')
    if (parts.length >= 2)
      baseDomains.add(parts.slice(-2).join('.'))
  }

  // Only fetch from domains that share a base domain with known network activity
  for (const match of allText.matchAll(SECONDARY_URL_RE)) {
    const url = match[0]
    if (alreadyLoadedUrls.has(url) || url.includes('127.0.0.1'))
      continue
    if (url.endsWith('.min.js.map') || url.endsWith('.js.map'))
      continue
    try {
      const hostname = new URL(url).hostname
      const parts = hostname.split('.')
      const baseDomain = parts.length >= 2 ? parts.slice(-2).join('.') : hostname
      if (!baseDomains.has(baseDomain))
        continue
    }
    catch { continue }
    urls.add(url)
  }

  // Try dynamic URL extractors for scripts that construct URLs at runtime
  const extractor = SECONDARY_URL_EXTRACTORS[key]
  if (extractor) {
    for (const url of extractor(existingBodies)) {
      if (!alreadyLoadedUrls.has(url))
        urls.add(url)
    }
  }

  if (urls.size > 0)
    console.log(`  🔎 Found ${urls.size} secondary JS URL(s) to analyze`)

  const bodies: string[] = []
  const scripts: ScriptSizeDetail[] = []
  for (const url of urls) {
    try {
      const res = await fetch(url)
      if (!res.ok)
        continue
      const contentType = res.headers.get('content-type') || ''
      // Only analyze JS responses (skip images, HTML error pages, etc.)
      if (!contentType.includes('javascript') && !contentType.includes('ecmascript') && !contentType.includes('json') && !url.endsWith('.js'))
        continue
      const body = await res.text()
      // Skip tiny responses (likely error pages or empty stubs)
      if (body.length < 50)
        continue
      bodies.push(body)
      const encoding = res.headers.get('content-encoding') || 'none'
      const transferBytes = Number(res.headers.get('content-length')) || body.length
      const decodedBytes = body.length
      scripts.push({
        url,
        transferKb: round(transferBytes),
        decodedKb: round(decodedBytes),
        encoding,
        durationMs: 0,
        initiatorType: 'secondary',
        protocol: 'unknown',
      })
      console.log(`  📦 Secondary: ${url} (${round(transferBytes)}KB transfer, ${round(decodedBytes)}KB decoded)`)
    }
    catch {}
  }
  return { bodies, scripts }
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
  posthog: `
    !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys onSessionId".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
    posthog.init('\${ID}', {api_host: 'https://us.i.posthog.com', persistence: 'memory'});`,
  googleMaps: `
    window.google = window.google || {};
    window.google.maps = window.google.maps || {};`,
  youtubePlayer: `
    window.onYouTubeIframeAPIReady = function() {};`,
  vercelAnalytics: `
    window.va = function() { (window.vaq = window.vaq || []).push(arguments) };
    window.vam = 'production';`,
  bingUet: `
    window.uetq = window.uetq || [];
    window.addEventListener('load', function() {
      if (typeof UET === 'function') {
        var o = { ti: '\${ID}', enableAutoSpaTracking: true };
        o.q = window.uetq;
        window.uetq = new UET(o);
        window.uetq.push('pageLoad');
      }
    });`,
  mixpanelAnalytics: `
    var mp = window.mixpanel = window.mixpanel || [];
    mp.__SV = 1.2; mp._i = mp._i || [];
    mp.init = function(token, config, name) {
      var target = name === 'mixpanel' || !name ? mp : (mp[name] = []);
      target.people = target.people || [];
      ['track','identify','reset','register'].forEach(function(m) { target[m] = function() { target.push([m].concat([].slice.call(arguments))); }; });
      ['set'].forEach(function(m) { target.people[m] = function() { target.push(['people.' + m].concat([].slice.call(arguments))); }; });
      mp._i.push([token, config, name || 'mixpanel']);
    };
    mp.init('test_token');`,
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

// Post-load triggers: scripts evaluated after page load to force lazy SDKs to fully initialize.
// Chat widgets, embeds, etc. won't load their full SDK without interaction or explicit boot.
const POST_LOAD_TRIGGERS: Record<string, string> = {
  intercom: `if (window.Intercom) { Intercom('boot', { app_id: window.intercomSettings?.app_id }); }`,
  crisp: `if (window.$crisp) { $crisp.push(['do', 'chat:open']); }`,
  hotjar: `if (window.hj) { hj('trigger', 'test'); }`,
}

function buildHtml(key: string, meta: { urls: string[], testId?: string | number }): string {
  let init = CLIENT_INIT[key] || ''
  if (init && meta.testId !== undefined)
    // eslint-disable-next-line no-template-curly-in-string
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

// Wait until no new network requests for `quietMs`, or until `timeoutMs` total elapsed.
// Playwright's networkidle (500ms silence) is too short for bootstraps that delay-load SDKs.
function waitForNetworkQuiet(
  cdpSession: CDPSession,
  quietMs = 3000,
  timeoutMs = 15000,
): Promise<void> {
  return new Promise((resolve) => {
    let lastActivity = Date.now()
    const start = Date.now()

    const onActivity = () => {
      lastActivity = Date.now()
    }

    const cleanup = () => {
      cdpSession.off('Network.requestWillBeSent', onActivity)
      cdpSession.off('Network.loadingFinished', onActivity)
      cdpSession.off('Network.loadingFailed', onActivity)
      resolve()
    }

    cdpSession.on('Network.requestWillBeSent', onActivity)
    cdpSession.on('Network.loadingFinished', onActivity)
    cdpSession.on('Network.loadingFailed', onActivity)

    const check = () => {
      if (Date.now() - start > timeoutMs) {
        cleanup()
        return
      }
      if (Date.now() - lastActivity >= quietMs) {
        cleanup()
        return
      }
      setTimeout(check, 500)
    }

    check()
  })
}

const EMPTY_PERF: PerformanceSummary = { taskDurationMs: 0, scriptDurationMs: 0, heapDeltaKb: 0 }

async function main() {
  const { port, close } = await startServer()
  console.log(`Server listening on http://127.0.0.1:${port}`)

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-features=ThirdPartyCookieBlocking'],
  })
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
        try {
          externalDomains.add(new URL(url).hostname)
        }
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
          else
            console.warn(`  ⚠️  Binary response (skipped AST): ${url}`)
        })
        .catch(() => {
          console.warn(`  ⚠️  CDP getResponseBody failed: ${url}`)
        })
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

    // Force-trigger lazy SDK loads (chat widgets, etc.) before waiting for waterfall
    const trigger = POST_LOAD_TRIGGERS[key]
    if (trigger) {
      await page.evaluate(trigger).catch(() => {})
      console.log(`  🔄 Triggered post-load init`)
    }

    // Wait for full waterfall: bootstraps often delay-load their SDK after networkidle.
    // 3s of network silence, max 15s total.
    await waitForNetworkQuiet(cdpSession, 3000, 15000)

    // Wait for async CDP getResponseBody calls to settle
    await new Promise(r => setTimeout(r, 500))

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

    // Fetch secondary SDK modules that bootstraps reference but don't load in headless.
    // Only from domains already seen in network waterfall + the script's own CDN domains.
    const alreadyLoadedUrls = new Set(scripts.map(s => s.url))
    const knownDomains = new Set(externalDomains)
    for (const url of meta.urls) {
      try {
        knownDomains.add(new URL(url).hostname)
      }
      catch {}
    }
    // Add domains from extractors (these scripts may not fully execute in headless)
    const extractor = SECONDARY_URL_EXTRACTORS[key]
    if (extractor) {
      for (const url of extractor(scriptBodies)) {
        try {
          knownDomains.add(new URL(url).hostname)
        }
        catch {}
      }
    }
    const secondary = await fetchSecondaryScripts(key, scriptBodies, alreadyLoadedUrls, knownDomains)
    scriptBodies.push(...secondary.bodies)
    // Include secondary script sizes in totals
    for (const s of secondary.scripts) {
      scripts.push(s)
      totalTransfer += s.transferKb
      totalDecoded += s.decodedKb
    }

    const allBodies = scriptBodies.join(' ')
    const collectsWebVitals = CWV_PATTERNS.some(p => allBodies.includes(p))
    if (collectsWebVitals)
      console.log(`  ⚡ Collects Web Vitals`)

    // Detect APIs: merge runtime instrumentation + AST analysis of every loaded script
    const accessedApis = await page.evaluate(() => [...(window as any).__apiAccess || []])
    const apis: ScriptApis = { ...EMPTY_APIS }
    // Runtime detection
    for (const api of accessedApis) {
      if (Object.hasOwn(apis, api))
        (apis as Record<string, boolean>)[api] = true
    }
    // AST analysis of each script body individually (catches APIs in code paths that don't execute in headless)
    for (let i = 0; i < scriptBodies.length; i++) {
      const body = scriptBodies[i]
      if (!body || body.length < 10)
        continue
      const astApis = detectApisFromSourceAst(body, `${key}-script-${i}.js`)
      for (const [api, found] of Object.entries(astApis)) {
        if (found && Object.hasOwn(apis, api))
          (apis as Record<string, boolean>)[api] = true
      }
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
    // Also includes off-DOM tracking pixels (new Image().src = url)
    const originalUrls = meta.urls
    const injectedElements = await page.evaluate((origUrls: string[]) => {
      const els: { tag: string, src: string }[] = []
      // DOM-appended elements
      for (const el of document.querySelectorAll('iframe[src], img[src], script[src]')) {
        const src = el.getAttribute('src') || ''
        if (src && !src.startsWith('http://127.0.0.1') && !src.startsWith('data:') && !origUrls.includes(src))
          els.push({ tag: el.tagName.toLowerCase(), src })
      }
      // Off-DOM tracking pixels (new Image().src = url, never appended to DOM)
      const seen = new Set(els.map(e => e.src))
      for (const src of (window as any).__trackingPixels || []) {
        if (!seen.has(src))
          els.push({ tag: 'img', src })
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
