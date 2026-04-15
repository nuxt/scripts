import { registry } from '@nuxt/scripts/registry'
import { useDebounceFn, useLocalStorage } from '@vueuse/core'
import { hasProtocol, withBase } from 'ufo'
import { computed, reactive, ref } from 'vue'
import { fetchScript } from '~/utils/fetch'
import { msToHumanReadable } from '~/utils/formatting'

export const refreshTime = ref(Date.now())

export const hostname = typeof window !== 'undefined' ? window.location.host : ''
export const path = ref('/')
export const query = ref()
export const base = ref('/')

// Standalone mode state
export const standaloneUrl = useLocalStorage<string>('nuxt-scripts:standalone-url', '')
export const isConnected = ref(false)
export const isStandalone = computed(() => !isConnected.value && !!standaloneUrl.value)

export const host = computed(() => {
  if (isStandalone.value)
    return standaloneUrl.value
  if (typeof window === 'undefined')
    return ''
  return withBase(base.value, `${window.location.protocol}//${hostname}`)
})

export const refreshSources = useDebounceFn(() => {
  refreshTime.value = Date.now()
}, 200)

export const slowRefreshSources = useDebounceFn(() => {
  refreshTime.value = Date.now()
}, 1000)

// Production preview state
export const previewSource = useLocalStorage<'local' | 'production'>('nuxt-scripts:preview-source', 'local')
export const productionUrl = ref<string>('')

export const hasProductionUrl = computed(() => {
  const url = productionUrl.value
  if (!url || !hasProtocol(url))
    return false
  return !url.includes('localhost') && !url.includes('127.0.0.1')
})

export const isProductionMode = computed(() => previewSource.value === 'production' && hasProductionUrl.value)

export interface FirstPartyDevtoolsScript {
  registryKey: string
  label: string
  logo: string
  category: string
  configKey: string
  mechanism: 'bundle-rewrite-intercept' | 'config-injection-proxy'
  hasAutoInject: boolean
  autoInjectField?: string
  hasSdkPatches: boolean
  canvasFingerprinting: boolean
  privacy: { ip: boolean, userAgent: boolean, language: boolean, screen: boolean, timezone: boolean, hardware: boolean }
  privacyLevel: 'full' | 'partial' | 'none'
  domains: string[]
  routes: Array<{ local: string, target: string }>
  interceptRules: Array<{ pattern: string, pathPrefix: string, target: string }>
}

export interface FirstPartyDevtoolsData {
  enabled: boolean
  proxyPrefix: string
  privacyMode: string
  scripts: FirstPartyDevtoolsScript[]
  totalRoutes: number
  totalDomains: number
}

const _registryPromise = registry()

export const scriptRegistry = ref<Awaited<ReturnType<typeof registry>>>([])
export const scripts = ref<Record<string, any>>({})
export const scriptSizes = reactive<Record<string, string>>({})
export const scriptErrors = reactive<Record<string, string>>({})
export const scriptTabs = reactive<Record<string, string>>({})
export const version = ref<string | null>(null)
export const firstPartyData = ref<FirstPartyDevtoolsData | null>(null)

let _lastSyncedScripts: any[] | null = null

export async function initRegistry() {
  scriptRegistry.value = await _registryPromise
  if (_lastSyncedScripts)
    syncScripts(_lastSyncedScripts)
}

const WORD_SEPARATOR_RE = /([\s_-])+/g
const SPACE_RE = / /g
const FUNC_PARAMS_RE = /\(([^)]*)\)/

function titleToCamelCase(s: string) {
  return s.replace(WORD_SEPARATOR_RE, ' ').split(' ').map((w, i) => {
    if (i === 0)
      return w.toLowerCase()
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  }).join('')
}

export function syncScripts(_scripts: any[]) {
  if (!_scripts || typeof _scripts !== 'object') {
    _lastSyncedScripts = null
    scripts.value = {}
    return
  }
  _lastSyncedScripts = _scripts
  scripts.value = Object.fromEntries(
    Object.entries({ ..._scripts })
      .map(([key, script]: [string, any]) => {
        script.registry = scriptRegistry.value.find(s => titleToCamelCase(s.label) === script.registryKey)
        if (script.registry) {
          const kebabCaseLabel = script.registry.label.toLowerCase().replace(SPACE_RE, '-')
          script.docs = `https://scripts.nuxt.com/scripts/${kebabCaseLabel}`
        }
        const loadingAt = script.events?.find((e: any) => e.status === 'loading')?.at || 0
        const loadedAt = script.events?.find((e: any) => e.status === 'loaded')?.at || 0
        if (loadingAt && loadedAt)
          script.loadTime = msToHumanReadable(loadedAt - loadingAt)
        const scriptSizeKey = script.src
        // Skip size fetching in standalone mode (cross-origin fetch blocked by CORS)
        if (!scriptSizes[scriptSizeKey] && script.src && !isStandalone.value) {
          fetchScript(script.src)
            .then((res) => {
              if (res.size) {
                scriptSizes[scriptSizeKey] = res.size
                script.size = res.size
              }
              if (res.error) {
                scriptErrors[scriptSizeKey] = res.error instanceof Error ? res.error.message : String(res.error)
                script.error = scriptErrors[scriptSizeKey]
              }
            })
        }
        return [key, script]
      }),
  )
}

// Script status helper (handles both reactive refs from embedded mode and plain strings from standalone)
export function getScriptStatus(script: any): string {
  const status = script?.$script?.status
  if (!status)
    return 'unknown'
  // Vue ref: has .value property
  if (typeof status === 'object' && 'value' in status)
    return status.value
  return String(status)
}

export function canControlScript(script: any): boolean {
  return typeof script?.$script?.load === 'function'
}

// First-party helpers
export function isFirstPartyScript(registryKey: string | undefined): boolean {
  if (!registryKey || !firstPartyData.value?.enabled)
    return false
  return firstPartyData.value.scripts.some(s => s.registryKey === registryKey)
}

export function getFirstPartyScript(registryKey: string | undefined): FirstPartyDevtoolsScript | undefined {
  if (!registryKey || !firstPartyData.value?.enabled)
    return undefined
  return firstPartyData.value.scripts.find(s => s.registryKey === registryKey)
}

// Script tab management
export function getActiveTab(scriptSrc: string) {
  return scriptTabs[scriptSrc] || 'events'
}

export function setActiveTab(scriptSrc: string, tab: string) {
  scriptTabs[scriptSrc] = tab
}

// Script logo helper
export function scriptLogo(script: any) {
  const logo = script.registry?.logo
  if (!logo)
    return null
  return typeof logo === 'object' ? (logo.dark || logo.light) : logo
}

// Interface formatting
export function formatFunctionSignature(name: string, func: (...args: any[]) => any): string {
  const funcStr = func.toString()
  const paramMatch = funcStr.match(FUNC_PARAMS_RE)
  const params = paramMatch?.[1]?.trim() || ''

  const formattedParams = params
    ? params.split(',').map((param, index) => {
        const trimmed = param.trim()
        if (!trimmed)
          return ''
        if (trimmed.includes(':'))
          return trimmed
        const paramName = trimmed || `param${index + 1}`
        return `${paramName}: any`
      }).filter(Boolean).join(', ')
    : ''

  let returnType = 'any'
  if (name.startsWith('is') || name.startsWith('has') || name.startsWith('can'))
    returnType = 'boolean'
  else if (name.startsWith('get') && name.includes('Element'))
    returnType = 'HTMLElement | null'
  else if (name.includes('async') || funcStr.includes('async') || funcStr.includes('Promise'))
    returnType = 'Promise<any>'
  else if (name.startsWith('on') || name.includes('listen') || name.includes('subscribe'))
    returnType = 'void'

  return `${name}(${formattedParams}): ${returnType}`
}

export function formatPropertySignature(name: string, value: any): string {
  let type = typeof value

  if (value === null)
    type = 'null'
  else if (Array.isArray(value))
    type = value.length > 0 && value.every(item => typeof item === typeof value[0]) ? `${typeof value[0]}[]` : 'any[]'
  else if (type === 'object')
    type = value.constructor?.name !== 'Object' ? value.constructor.name : 'object'
  else if (type === 'function')
    type = 'Function'

  return `${name}: ${type}`
}

export function formatScriptInterface(instance: any): string {
  if (!instance || typeof instance !== 'object')
    return 'interface ScriptInstance {\n  // No API available\n}'

  const members = Object.entries(instance).map(([key, value]) =>
    typeof value === 'function'
      ? `  ${formatFunctionSignature(key, value as (...args: any[]) => any)}`
      : `  ${formatPropertySignature(key, value)}`,
  )

  return members.length
    ? `interface ScriptInstance {\n${members.join('\n')}\n}`
    : 'interface ScriptInstance {\n  // No API available\n}'
}
