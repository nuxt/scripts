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

export interface ApiPrivacyScore {
  /** 0–100, higher = more invasive */
  score: number
  /** Persistence APIs used (cookies, localStorage, sessionStorage, indexedDB) */
  persistence: number
  /** Fingerprinting APIs used (canvas, webgl, audioContext, deviceMemory, hardwareConcurrency, plugins, screen, userAgent, languages, timezone, platform, vendor, connection, maxTouchPoints, devicePixelRatio, mediaDevices, getBattery) */
  fingerprinting: number
  /** Tracking APIs used (referrer, windowName, rtcPeerConnection, geolocation, serviceWorker, cacheApi) */
  tracking: number
  /** Behavioral monitoring APIs used (mutationObserver, intersectionObserver) */
  monitoring: number
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
  apiPrivacyScore: ApiPrivacyScore
  // Cookies set by the script
  cookies: ScriptCookie[]
  // Network behavior
  network: NetworkSummary
  // Performance impact
  performance: PerformanceSummary
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

// Privacy concern categories — grouped by what they enable.
// Network APIs (fetch, xhr, sendBeacon, websocket) and performanceObserver are
// functional (every script needs to send data) and excluded from scoring.
const PERSISTENCE_APIS = ['cookies', 'localStorage', 'sessionStorage', 'indexedDB'] as const
const FINGERPRINTING_APIS = ['canvas', 'webgl', 'audioContext', 'deviceMemory', 'hardwareConcurrency', 'plugins', 'screen', 'userAgent', 'languages', 'timezone', 'platform', 'vendor', 'connection', 'maxTouchPoints', 'devicePixelRatio', 'mediaDevices', 'getBattery'] as const
const TRACKING_APIS = ['referrer', 'windowName', 'rtcPeerConnection', 'geolocation', 'serviceWorker', 'cacheApi'] as const
const MONITORING_APIS = ['mutationObserver', 'intersectionObserver'] as const

// Weights: persistence enables cross-visit tracking (heaviest), tracking enables
// cross-site identification, fingerprinting enables device identification,
// monitoring enables behavioral observation.
const PERSISTENCE_WEIGHT = 10
const TRACKING_WEIGHT = 8
const FINGERPRINTING_WEIGHT = 6
const MONITORING_WEIGHT = 4

const MAX_SCORE = PERSISTENCE_APIS.length * PERSISTENCE_WEIGHT
  + TRACKING_APIS.length * TRACKING_WEIGHT
  + FINGERPRINTING_APIS.length * FINGERPRINTING_WEIGHT
  + MONITORING_APIS.length * MONITORING_WEIGHT

function computeApiPrivacyScore(apis: ScriptApis): ApiPrivacyScore {
  const count = (keys: readonly (keyof ScriptApis)[]) => keys.filter(k => apis[k]).length
  const persistence = count(PERSISTENCE_APIS)
  const fingerprinting = count(FINGERPRINTING_APIS)
  const tracking = count(TRACKING_APIS)
  const monitoring = count(MONITORING_APIS)

  const raw = persistence * PERSISTENCE_WEIGHT
    + tracking * TRACKING_WEIGHT
    + fingerprinting * FINGERPRINTING_WEIGHT
    + monitoring * MONITORING_WEIGHT

  return {
    score: Math.round((raw / MAX_SCORE) * 100),
    persistence,
    fingerprinting,
    tracking,
    monitoring,
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

    return {
      id,
      label: entry.label || id || '',
      category: entry.category || 'unknown',
      scripts: size?.scripts ?? [],
      totalTransferKb: size?.totalTransferKb ?? 0,
      totalDecodedKb: size?.totalDecodedKb ?? 0,
      trackedData: meta?.trackedData ?? [],
      collectsWebVitals: size?.collectsWebVitals ?? false,
      apis: size?.apis ?? {} as ScriptApis,
      apiPrivacyScore: computeApiPrivacyScore(size?.apis ?? {} as ScriptApis),
      cookies: size?.cookies ?? [],
      network: size?.network ?? { requestCount: 0, domains: [], outboundBytes: 0, inboundBytes: 0, injectedElements: [] },
      performance: size?.performance ?? { taskDurationMs: 0, scriptDurationMs: 0, heapDeltaKb: 0 },
      cwvEstimate: computeCwvEstimate(
        size?.performance ?? { taskDurationMs: 0, scriptDurationMs: 0, heapDeltaKb: 0 },
        size?.network ?? { requestCount: 0, domains: [], outboundBytes: 0, inboundBytes: 0, injectedElements: [] },
        size?.apis ?? {} as ScriptApis,
      ),
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
