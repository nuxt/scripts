import type { TrackedDataType } from './script-meta'
import { getAllProxyConfigs } from './proxy-configs'
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
  // Features
  hasBundling: boolean
  hasProxy: boolean
  // Network
  domains: string[]
  endpoints: number
  // Privacy
  privacy: ScriptPrivacy | null
  privacyLevel: 'full' | 'partial' | 'none' | 'unknown'
  // Loading
  loadingMethod: 'cdn' | 'npm' | 'dynamic'
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
  // eslint-disable-next-line e18e/prefer-array-to-sorted
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
  const proxyConfigs = getAllProxyConfigs('/_scripts/assets')
  const sizes = scriptSizes as Record<string, { totalTransferKb: number, totalDecodedKb: number, loadTimeMs: number, scripts: ScriptSizeDetail[] }>

  return entries.map((entry) => {
    const metaKey = deriveMetaKey(entry.import?.name, entry.label)
    const meta = scriptMeta[metaKey]
    const size = sizes[metaKey]
    const proxyConfig = entry.proxy ? proxyConfigs[entry.proxy] : undefined

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
      id: metaKey,
      label: entry.label || metaKey,
      category: entry.category || 'unknown',
      scripts: size?.scripts ?? [],
      totalTransferKb: size?.totalTransferKb ?? 0,
      totalDecodedKb: size?.totalDecodedKb ?? 0,
      trackedData: meta?.trackedData ?? [],
      hasBundling: entry.scriptBundling !== false && entry.scriptBundling !== undefined,
      hasProxy: !!entry.proxy,
      domains,
      endpoints,
      privacy,
      privacyLevel: computePrivacyLevel(privacy),
      loadingMethod,
    }
  })
}
