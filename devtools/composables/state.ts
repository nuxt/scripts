import { reactive, ref } from 'vue'
import { fetchScript } from '~/utils/fetch'
import { msToHumanReadable } from '~/utils/formatting'
import { registry } from '../../src/registry'

export interface FirstPartyDevtoolsScript {
  registryKey: string
  label: string
  logo: string
  category: string
  configKey: string
  mechanism: 'bundle-rewrite-intercept' | 'config-injection-proxy'
  hasAutoInject: boolean
  autoInjectField?: string
  hasPostProcess: boolean
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

export async function initRegistry() {
  scriptRegistry.value = await _registryPromise
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
    scripts.value = {}
    return
  }
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
        if (!scriptSizes[scriptSizeKey] && script.src) {
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
