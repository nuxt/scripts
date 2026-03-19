import type { RegistryScriptKey } from './runtime/types'
import type { TrackedDataType } from './script-meta'
import { getAllProxyConfigs } from './first-party'
import { scriptMeta } from './script-meta'
import scriptSizes from './script-sizes.json'

export type { TrackedDataType }

export interface ScriptPrivacy {
  ip: boolean
  userAgent: boolean
  language: boolean
  screen: boolean
  timezone: boolean
  hardware: boolean
}

export interface ScriptSizeDetail {
  url: string
  transferKb: number
  decodedKb: number
  encoding: string
  durationMs: number
  initiatorType: string
  protocol: string
}

export interface ScriptApis {
  cookies: boolean
  localStorage: boolean
  sessionStorage: boolean
  indexedDB: boolean
  canvas: boolean
  webgl: boolean
  audioContext: boolean
  userAgent: boolean
  doNotTrack: boolean
  hardwareConcurrency: boolean
  deviceMemory: boolean
  plugins: boolean
  languages: boolean
  screen: boolean
  timezone: boolean
  platform: boolean
  vendor: boolean
  connection: boolean
  maxTouchPoints: boolean
  devicePixelRatio: boolean
  mediaDevices: boolean
  getBattery: boolean
  referrer: boolean
  windowName: boolean
  rtcPeerConnection: boolean
  geolocation: boolean
  serviceWorker: boolean
  cacheApi: boolean
  sendBeacon: boolean
  fetch: boolean
  xhr: boolean
  websocket: boolean
  mutationObserver: boolean
  performanceObserver: boolean
  intersectionObserver: boolean
}

export type PrivacyGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F'

export interface PrivacyRating {
  /** Overall letter grade */
  grade: PrivacyGrade
  /** 0–100, higher = more invasive */
  score: number
  /** Breakdown by privacy concern category */
  breakdown: {
    /** Browser fingerprinting APIs — entropy-weighted per AmIUnique/Panopticlick research (0–30) */
    fingerprinting: { score: number, apis: string[] }
    /** Persistent storage + cookie tracking (0–25) */
    persistence: { score: number, thirdPartyCookies: number, longLivedCookies: number, storageApis: string[] }
    /** Cross-domain data exfiltration & tracking network (0–25) */
    network: { score: number, domains: number, outboundBytes: number, trackingPixels: number }
    /** Behavioral observation APIs (0–10) */
    monitoring: { score: number, apis: string[] }
    /** Data collection scope — what types of data are tracked (0–10) */
    dataScope: { score: number, types: string[] }
    /** Fingerprint exfiltration — heavy FP APIs combined with outbound channels (0–25) */
    fpExfiltration: { score: number, heavyApis: string[] }
  }
}

export interface ScriptCookie {
  name: string
  domain: string
  path: string
  httpOnly: boolean
  secure: boolean
  sameSite: string
  session: boolean
  lifetimeDays: number
  firstParty: boolean
}

export interface NetworkSummary {
  requestCount: number
  domains: string[]
  outboundBytes: number
  inboundBytes: number
  injectedElements: { tag: string, src: string }[]
}

export interface CwvEstimate {
  /** Estimated LCP delay: scriptDurationMs blocks rendering during page load */
  lcpImpactMs: number
  /** CLS risk: true if script injects visible DOM elements (iframes, images) without reserved space */
  clsRisk: boolean
  /** Number of visible elements injected that could cause layout shifts */
  clsElements: number
  /** INP risk level based on script weight + DOM observation */
  inpRiskLevel: 'low' | 'medium' | 'high'
}

export interface PerformanceSummary {
  taskDurationMs: number
  scriptDurationMs: number
  heapDeltaKb: number
}

export type PerformanceGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F'

export interface PerformanceRating {
  /** Overall letter grade */
  grade: PerformanceGrade
  /** 0–100, higher = worse performance impact */
  score: number
  /** Breakdown by impact area */
  breakdown: {
    /** Network cost — transfer size relative to performance budgets (0–30) */
    networkCost: { score: number, transferKb: number }
    /** Main thread blocking — task duration that delays interactivity (0–30) */
    mainThread: { score: number, taskDurationMs: number, scriptDurationMs: number }
    /** Memory pressure — heap allocation impact (0–20) */
    memory: { score: number, heapDeltaKb: number }
    /** Connection overhead — additional HTTP requests (0–10) */
    connections: { score: number, requestCount: number }
    /** CWV risk — estimated Core Web Vitals impact (0–10) */
    cwvRisk: { score: number, lcpImpactMs: number, clsRisk: boolean, inpRiskLevel: string }
  }
}

export interface ScriptStats {
  id: string
  label: string
  category: string
  // Size
  scripts: ScriptSizeDetail[]
  totalTransferKb: number
  totalDecodedKb: number
  // Data tracking
  trackedData: TrackedDataType[]
  collectsWebVitals: boolean
  // Browser APIs used
  apis: ScriptApis
  privacyRating: PrivacyRating
  // Cookies set by the script
  cookies: ScriptCookie[]
  // Network behavior
  network: NetworkSummary
  // Performance impact
  performance: PerformanceSummary
  performanceRating: PerformanceRating
  // Core Web Vitals estimated impact (computed from measured data)
  cwvEstimate: CwvEstimate
  // Features
  hasBundling: boolean
  hasProxy: boolean
  // Proxy routing
  proxyDomains: string[]
  proxyEndpoints: number
  // Privacy
  privacy: ScriptPrivacy | null
  privacyLevel: 'full' | 'partial' | 'none' | 'unknown'
  // Loading
  loadingMethod: 'cdn' | 'npm' | 'dynamic'
}

// ── Privacy scoring ─────────────────────────────────────────────────
// Entropy-weighted fingerprinting scores based on AmIUnique (2016) and
// EFF Panopticlick (2020) research. Values approximate bits of entropy
// each API contributes to a unique device fingerprint.
const FINGERPRINT_ENTROPY: Partial<Record<keyof ScriptApis, number>> = {
  canvas: 6, // ~17 bits — renders unique per GPU/driver/font stack
  webgl: 6, // ~15 bits — GPU renderer string uniquely identifies hardware
  audioContext: 5, // ~12 bits — audio processing stack fingerprint
  rtcPeerConnection: 4, // leaks real IP behind VPN, enables WebRTC fingerprinting
  mediaDevices: 3, // enumerates cameras/mics — hardware inventory
  plugins: 3, // historically ~15 bits, declining in modern browsers
  screen: 3, // ~8 bits — resolution + colorDepth
  geolocation: 3, // precise location (requires permission but very invasive)
  timezone: 2, // ~5 bits
  languages: 2, // ~5 bits
  hardwareConcurrency: 2, // ~3.5 bits — CPU core count
  deviceMemory: 2, // ~2.5 bits — RAM bucket
  userAgent: 1, // being frozen by UA-CH, declining utility
  platform: 1, // ~3 bits but highly correlated with userAgent
  vendor: 1, // low entropy, mostly "Google Inc."
  maxTouchPoints: 1, // ~2 bits
  devicePixelRatio: 1, // ~3 bits but correlated with screen
  connection: 1, // network type — low entropy
  getBattery: 1, // low entropy but privacy concern (removed from most browsers)
}
const MAX_FINGERPRINT = Object.values(FINGERPRINT_ENTROPY).reduce((a, b) => a + b, 0)

// Persistence: APIs that enable cross-visit tracking
const STORAGE_API_WEIGHT: Partial<Record<keyof ScriptApis, number>> = {
  cookies: 4, // cross-domain capable, most abused
  localStorage: 3, // persistent, survives tab close
  indexedDB: 3, // large persistent storage
  sessionStorage: 1, // session-scoped, less invasive
}
const MAX_STORAGE_API = Object.values(STORAGE_API_WEIGHT).reduce((a, b) => a + b, 0)

// Monitoring: behavioral observation
const MONITOR_WEIGHT: Partial<Record<keyof ScriptApis, number>> = {
  mutationObserver: 5, // sees all DOM changes — behavioral tracking
  intersectionObserver: 3, // viewport/scroll tracking
  windowName: 2, // cross-origin data channel
}
const MAX_MONITOR = Object.values(MONITOR_WEIGHT).reduce((a, b) => a + b, 0)

// Data scope: more invasive tracking types score higher
const DATA_SCOPE_WEIGHT: Partial<Record<TrackedDataType, number>> = {
  'session-replay': 5, // records entire user session
  'heatmaps': 4, // tracks mouse movement / attention
  'user-identity': 4, // PII-adjacent
  'retargeting': 3, // cross-site ad following
  'audiences': 3, // user profiling
  'ab-testing': 2, // behavioral segmentation
  'form-submissions': 2, // captures input data
  'clicks': 1,
  'scrolls': 1,
  'conversions': 1,
  'events': 0, // basic analytics, expected
  'page-views': 0, // basic analytics, expected
  'transactions': 1,
  'errors': 0, // functional
  'video-engagement': 0,
  'tag-injection': 5, // loads unknown third-party code — wildcard privacy risk
}

// Known API usage that our AST detection misses due to obfuscation, eval(), or
// runtime code generation. These are manually verified and added as corrections.
const KNOWN_UNDETECTED_APIS: Partial<Record<string, (keyof ScriptApis)[]>> = {
  // reCAPTCHA: bot detection fingerprints via canvas, webgl, audio — heavily obfuscated
  googleRecaptcha: ['canvas', 'webgl', 'audioContext'],
}

// High-entropy fingerprinting APIs that create unique, cross-site-trackable
// device identifiers. These are qualitatively different from passive FP
// (screen dims, userAgent) — they generate renders or probe hardware in ways
// that produce near-unique signatures.
const HEAVY_FP_APIS: (keyof ScriptApis)[] = ['canvas', 'webgl', 'audioContext', 'rtcPeerConnection']

// APIs used for legitimate product functionality, not fingerprinting.
// Exempts these from the fingerprint exfiltration penalty.
const KNOWN_FUNCTIONAL_APIS: Partial<Record<string, (keyof ScriptApis)[]>> = {
  // Crisp: voice/video chat requires audio, WebRTC, and camera/mic enumeration
  crisp: ['audioContext', 'rtcPeerConnection', 'mediaDevices'],
  // Intercom: canvas used for UI rendering, not fingerprinting
  intercom: ['canvas'],
}

function computePrivacyRating(
  apis: ScriptApis,
  cookies: ScriptCookie[],
  network: NetworkSummary,
  trackedData: TrackedDataType[],
  functionalApis?: Set<keyof ScriptApis>,
): PrivacyRating {
  // ── 1. Fingerprinting (0–30) ──
  const fingerprintApis: string[] = []
  let fingerprintRaw = 0
  for (const [api, weight] of Object.entries(FINGERPRINT_ENTROPY)) {
    if (apis[api as keyof ScriptApis]) {
      fingerprintRaw += weight
      fingerprintApis.push(api)
    }
  }
  const fingerprintScore = Math.round((fingerprintRaw / MAX_FINGERPRINT) * 30)

  // ── 2. Persistence & cookies (0–25) ──
  // Storage APIs (0–11 raw → 0–10 normalized)
  const storageApis: string[] = []
  let storageRaw = 0
  for (const [api, weight] of Object.entries(STORAGE_API_WEIGHT)) {
    if (apis[api as keyof ScriptApis]) {
      storageRaw += weight
      storageApis.push(api)
    }
  }
  const storageScore = Math.round((storageRaw / MAX_STORAGE_API) * 10)

  // Actual cookies set (0–15)
  const thirdPartyCookies = cookies.filter(c => !c.firstParty).length
  const longLivedCookies = cookies.filter(c => c.lifetimeDays > 30).length
  // 3 pts per third-party cookie (max 9) + 2 pts per long-lived cookie (max 6)
  const cookieScore = Math.min(9, thirdPartyCookies * 3) + Math.min(6, longLivedCookies * 2)
  const persistenceScore = Math.min(25, storageScore + cookieScore)

  // ── 3. Network tracking (0–25) ──
  const domainCount = network.domains.length
  // 4 pts per domain beyond the first (loading from your own CDN is expected)
  const domainScore = Math.min(12, Math.max(0, domainCount - 1) * 4)
  // Outbound data: POST/beacon bodies + tracking pixel URL query params
  // Tracking pixels exfiltrate data via GET query strings (screen dims, page URLs, etc.)
  const pixelQueryBytes = network.injectedElements
    .filter(e => e.tag === 'img' && e.src.includes('?'))
    .reduce((sum, e) => sum + new URL(e.src).search.length, 0)
  const totalOutbound = network.outboundBytes + pixelQueryBytes
  const outboundScore = totalOutbound === 0 ? 0 : Math.min(8, Math.ceil(totalOutbound / 250))
  // Tracking pixels & injected iframes
  const trackingPixels = network.injectedElements.filter(e => e.tag === 'img').length
  const injectedIframes = network.injectedElements.filter(e => e.tag === 'iframe').length
  const injectionScore = Math.min(5, trackingPixels * 3 + injectedIframes * 2)
  const networkScore = Math.min(25, domainScore + outboundScore + injectionScore)

  // ── 4. Behavioral monitoring (0–10) ──
  const monitorApis: string[] = []
  let monitorRaw = 0
  for (const [api, weight] of Object.entries(MONITOR_WEIGHT)) {
    if (apis[api as keyof ScriptApis]) {
      monitorRaw += weight
      monitorApis.push(api)
    }
  }
  const monitorScore = Math.round((monitorRaw / MAX_MONITOR) * 10)

  // ── 5. Data scope (0–10) ──
  const scopeTypes = trackedData.filter(t => (DATA_SCOPE_WEIGHT[t] ?? 0) > 0)
  const scopeRaw = trackedData.reduce((sum, t) => sum + (DATA_SCOPE_WEIGHT[t] ?? 0), 0)
  const scopeScore = Math.min(10, scopeRaw)

  // ── 6. Fingerprint exfiltration (0–25) ──
  // The real privacy harm: collecting unique device fingerprints AND sending
  // them to servers. Light FP data (screen dims, userAgent) is expected and
  // harmless alone. Heavy FP APIs (canvas/webgl/audio renders) create near-
  // unique identifiers — when combined with exfiltration channels, they enable
  // cross-site tracking.
  const heavyFpApis = HEAVY_FP_APIS.filter(api => apis[api] && !functionalApis?.has(api))
  const hasExfiltration = totalOutbound > 0 || domainCount > 1 || trackingPixels > 0 || apis.sendBeacon
  const fpExfilScore = heavyFpApis.length > 0 && hasExfiltration
    ? Math.min(25, heavyFpApis.length * 9)
    : 0

  // ── Total & grade ──
  const score = fingerprintScore + persistenceScore + networkScore + monitorScore + scopeScore + fpExfilScore

  let grade: PrivacyGrade
  if (score <= 5)
    grade = 'A+'
  else if (score <= 15)
    grade = 'A'
  else if (score <= 30)
    grade = 'B'
  else if (score <= 50)
    grade = 'C'
  else if (score <= 70)
    grade = 'D'
  else grade = 'F'

  return {
    grade,
    score,
    breakdown: {
      fingerprinting: { score: fingerprintScore, apis: fingerprintApis },
      persistence: { score: persistenceScore, thirdPartyCookies, longLivedCookies, storageApis },
      network: { score: networkScore, domains: domainCount, outboundBytes: totalOutbound, trackingPixels },
      monitoring: { score: monitorScore, apis: monitorApis },
      dataScope: { score: scopeScore, types: scopeTypes },
      fpExfiltration: { score: fpExfilScore, heavyApis: heavyFpApis },
    },
  }
}

// Visible elements that cause CLS when injected without reserved space
const CLS_RISK_TAGS = new Set(['iframe', 'img', 'div', 'video'])

function computeCwvEstimate(perf: PerformanceSummary, network: NetworkSummary, apis: ScriptApis): CwvEstimate {
  // LCP: script execution directly blocks rendering
  const lcpImpactMs = perf.scriptDurationMs

  // CLS: injected visible elements shift layout
  const clsElements = network.injectedElements.filter(e => CLS_RISK_TAGS.has(e.tag)).length
  const clsRisk = clsElements > 0

  // INP: script weight + DOM observation = ongoing main thread contention
  // High: >15ms script + mutationObserver (code runs on every DOM change)
  // Medium: >15ms script OR mutationObserver
  // Low: neither
  const heavyScript = perf.scriptDurationMs > 15
  const domObserver = apis.mutationObserver
  const inpRiskLevel = heavyScript && domObserver
    ? 'high' as const
    : (heavyScript || domObserver)
        ? 'medium' as const
        : 'low' as const

  return { lcpImpactMs, clsRisk, clsElements, inpRiskLevel }
}

// ── Performance scoring ─────────────────────────────────────────────
// Absolute thresholds based on web performance budgets, not relative to
// this dataset. A new script added later won't shift existing grades.
//
// Network budget reference: Google's "cost of JavaScript" research
// recommends <50kb for third-party scripts on mobile.
// Main thread: 50ms is the Long Task threshold (web.dev).
// Heap: V8 minor GC triggers around 2–4MB, so staying under 1MB is ideal.

function scoreSteps(value: number, steps: [number, number][]): number {
  let score = 0
  for (const [threshold, points] of steps) {
    if (value >= threshold)
      score = points
  }
  return score
}

function computePerformanceRating(
  perf: PerformanceSummary,
  transferKb: number,
  network: NetworkSummary,
  cwv: CwvEstimate,
): PerformanceRating {
  // ── 1. Network cost (0–30) — transfer size ──
  // Thresholds: <5kb=0, <15kb=5, <30kb=10, <60kb=15, <120kb=20, <250kb=25, >=250kb=30
  const networkScore = scoreSteps(transferKb, [
    [5, 5],
    [15, 10],
    [30, 15],
    [60, 20],
    [120, 25],
    [250, 30],
  ])

  // ── 2. Main thread blocking (0–30) — taskDurationMs ──
  // <10ms=0, <20ms=5, <30ms=10, <50ms=18, <75ms=25, >=75ms=30
  const mainThreadScore = scoreSteps(perf.taskDurationMs, [
    [10, 5],
    [20, 10],
    [30, 18],
    [50, 25],
    [75, 30],
  ])

  // ── 3. Memory pressure (0–20) — heap delta ──
  // <750kb=0, <1000kb=5, <1500kb=10, <2000kb=15, >=2000kb=20
  const memoryScore = scoreSteps(perf.heapDeltaKb, [
    [750, 5],
    [1000, 10],
    [1500, 15],
    [2000, 20],
  ])

  // ── 4. Connection overhead (0–10) — request count ──
  // 1=0, 2=3, 3=5, >3=7, >5=10
  const connectionScore = scoreSteps(network.requestCount, [
    [2, 3],
    [3, 5],
    [4, 7],
    [6, 10],
  ])

  // ── 5. CWV risk (0–10) ──
  const cwvScore
    = (cwv.lcpImpactMs > 15 ? 3 : 0) // script execution blocks LCP
      + (cwv.clsRisk ? Math.min(4, cwv.clsElements * 2) : 0) // layout shift risk
      + (cwv.inpRiskLevel === 'high' ? 3 : cwv.inpRiskLevel === 'medium' ? 1 : 0)

  const score = networkScore + mainThreadScore + memoryScore + connectionScore + cwvScore

  let grade: PerformanceGrade
  if (score <= 5)
    grade = 'A+'
  else if (score <= 15)
    grade = 'A'
  else if (score <= 30)
    grade = 'B'
  else if (score <= 50)
    grade = 'C'
  else if (score <= 70)
    grade = 'D'
  else grade = 'F'

  return {
    grade,
    score,
    breakdown: {
      networkCost: { score: networkScore, transferKb },
      mainThread: { score: mainThreadScore, taskDurationMs: perf.taskDurationMs, scriptDurationMs: perf.scriptDurationMs },
      memory: { score: memoryScore, heapDeltaKb: perf.heapDeltaKb },
      connections: { score: connectionScore, requestCount: network.requestCount },
      cwvRisk: { score: cwvScore, lcpImpactMs: cwv.lcpImpactMs, clsRisk: cwv.clsRisk, inpRiskLevel: cwv.inpRiskLevel },
    },
  }
}

const DOMAIN_RE = /^https?:\/\/([^/]+)/
const USE_SCRIPT_RE = /^useScript/
const WORD_SPLIT_RE = /[\s-]+/

function computePrivacyLevel(privacy: ScriptPrivacy | null): ScriptStats['privacyLevel'] {
  if (!privacy)
    return 'unknown'
  const flags = Object.values(privacy)
  if (flags.every(Boolean))
    return 'full'
  if (flags.some(Boolean))
    return 'partial'
  return 'none'
}

function extractDomains(routes: Record<string, { proxy: string }>): string[] {
  const domains = new Set<string>()
  for (const { proxy } of Object.values(routes)) {
    const match = proxy.match(DOMAIN_RE)
    if (match?.[1])
      domains.add(match[1])
  }

  return [...domains].sort()
}

/**
 * Derives a camelCase meta key from a composable name like "useScriptGoogleAnalytics" → "googleAnalytics"
 * or from a label like "Carbon Ads" → "carbonAds"
 */
function deriveMetaKey(importName?: string, label?: string): string {
  if (importName) {
    // Strip "useScript" prefix and lowercase first char
    const stripped = importName.replace(USE_SCRIPT_RE, '')
    return stripped.charAt(0).toLowerCase() + stripped.slice(1)
  }
  if (label) {
    // "Carbon Ads" → "carbonAds", "Google Tag Manager" → "googleTagManager"
    const words = label.split(WORD_SPLIT_RE)
    return words.map((w, i) =>
      i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
    ).join('')
  }
  return ''
}

export async function getScriptStats(): Promise<ScriptStats[]> {
  const { registry } = await import('./registry')
  const entries = await registry()
  const proxyConfigs = getAllProxyConfigs('/_scripts/p')
  const sizes = scriptSizes as Record<string, { totalTransferKb: number, totalDecodedKb: number, loadTimeMs: number, collectsWebVitals: boolean, apis: ScriptApis, cookies: ScriptCookie[], network: NetworkSummary, performance: PerformanceSummary, scripts: ScriptSizeDetail[] }>

  return entries.map((entry) => {
    const id = entry.registryKey || deriveMetaKey(entry.import?.name, entry.label) as RegistryScriptKey
    const meta = id && id in scriptMeta ? scriptMeta[id as keyof typeof scriptMeta] : undefined
    const size = sizes[id || '']
    const proxyConfigKey = entry.proxy === false ? undefined : (entry.proxy || entry.registryKey)
    const proxyConfig = proxyConfigKey ? proxyConfigs[proxyConfigKey] : undefined

    // Determine loading method
    let loadingMethod: ScriptStats['loadingMethod'] = 'cdn'
    if (entry.src === false)
      loadingMethod = 'npm'
    else if (!entry.src && typeof entry.scriptBundling === 'function')
      loadingMethod = 'dynamic'

    // Extract proxy info
    const privacy = proxyConfig?.privacy as ScriptPrivacy | undefined ?? null
    const routes = proxyConfig?.routes ?? {}
    const domains = extractDomains(routes)
    const endpoints = Object.keys(routes).length

    const emptyApis = {} as ScriptApis
    const emptyNetwork: NetworkSummary = { requestCount: 0, domains: [], outboundBytes: 0, inboundBytes: 0, injectedElements: [] }
    const emptyPerf: PerformanceSummary = { taskDurationMs: 0, scriptDurationMs: 0, heapDeltaKb: 0 }

    const apis = { ...(size?.apis ?? emptyApis) }
    // Apply known API corrections for scripts with obfuscated fingerprinting
    const knownApis = KNOWN_UNDETECTED_APIS[id]
    if (knownApis) {
      for (const api of knownApis) apis[api] = true
    }
    const cookies = size?.cookies ?? []
    const network = size?.network ?? emptyNetwork
    const perf = size?.performance ?? emptyPerf
    const trackedData = meta?.trackedData ?? []
    const scripts = size?.scripts ?? []
    const transferKb = size?.totalTransferKb ?? 0
    // Primary transfer: exclude secondary scripts (fetched by our analysis tool for AST
    // inspection, not loaded by the browser during normal page use)
    const primaryTransferKb = scripts.length > 0
      ? Number.parseFloat(scripts.filter(s => s.initiatorType !== 'secondary').reduce((sum, s) => sum + s.transferKb, 0).toFixed(1))
      : transferKb

    const cwvEstimate = computeCwvEstimate(perf, network, apis)

    return {
      id,
      label: entry.label || id || '',
      category: entry.category || 'unknown',
      scripts,
      totalTransferKb: transferKb,
      totalDecodedKb: size?.totalDecodedKb ?? 0,
      trackedData,
      collectsWebVitals: size?.collectsWebVitals ?? false,
      apis,
      privacyRating: computePrivacyRating(apis, cookies, network, trackedData, KNOWN_FUNCTIONAL_APIS[id] ? new Set(KNOWN_FUNCTIONAL_APIS[id]) : undefined),
      cookies,
      network,
      performance: perf,
      performanceRating: computePerformanceRating(perf, primaryTransferKb, network, cwvEstimate),
      cwvEstimate,
      hasBundling: entry.scriptBundling !== false && entry.scriptBundling !== undefined,
      hasProxy: !!proxyConfig,
      proxyDomains: domains,
      proxyEndpoints: endpoints,
      privacy,
      privacyLevel: computePrivacyLevel(privacy),
      loadingMethod,
    }
  })
}
