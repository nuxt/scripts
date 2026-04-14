import type { Nuxt } from '@nuxt/schema'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { ProxyConfig, RegistryScript } from './runtime/types'
import { existsSync } from 'node:fs'
import { createResolver, extendViteConfig } from '@nuxt/kit'

const DEVTOOLS_UI_ROUTE = '/__nuxt-scripts'
const DEVTOOLS_UI_LOCAL_PORT = 3030
const DEVTOOLS_API_STATE_ROUTE = '/__nuxt-scripts-api/state'

export interface DevtoolsOptions {
  standalone?: boolean
}

export async function setupDevtools(nuxt: Nuxt, options: DevtoolsOptions = {}) {
  const { addCustomTab } = await import('@nuxt/devtools-kit')

  const { resolve } = createResolver(import.meta.url)
  const clientPath = resolve('../dist/devtools-client')
  const isProductionBuild = existsSync(clientPath)

  if (isProductionBuild) {
    nuxt.hook('vite:serverCreated', async (server) => {
      const sirv = await import('sirv').then(r => r.default || r)
      server.middlewares.use(DEVTOOLS_UI_ROUTE, sirv(clientPath, { dev: true, single: true }))
    })
  }
  else {
    extendViteConfig((config) => {
      config.server = config.server || {}
      config.server.proxy = config.server.proxy || {}
      config.server.proxy[DEVTOOLS_UI_ROUTE] = {
        target: `http://localhost:${DEVTOOLS_UI_LOCAL_PORT}${DEVTOOLS_UI_ROUTE}`,
        changeOrigin: true,
        followRedirects: true,
        rewrite: path => path.replace(DEVTOOLS_UI_ROUTE, ''),
      }
    })
  }

  // Standalone devtools API: in-memory state bridge between the Nuxt app client and the devtools standalone UI
  if (options.standalone) {
    setupStandaloneApi(nuxt)
  }

  addCustomTab({
    name: 'nuxt-scripts',
    title: 'Scripts',
    icon: 'carbon:script',
    view: {
      type: 'iframe',
      src: DEVTOOLS_UI_ROUTE,
    },
  })
}

function setupStandaloneApi(nuxt: Nuxt) {
  // In-memory store for serialized script state
  let scriptsState: { scripts: Record<string, any>, version?: string, firstPartyData?: any, updatedAt: number } = {
    scripts: {},
    updatedAt: 0,
  }

  nuxt.hook('vite:serverCreated', (server) => {
    server.middlewares.use(DEVTOOLS_API_STATE_ROUTE, (req: IncomingMessage, res: ServerResponse) => {
      // CORS headers for standalone devtools running on a different origin
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

      if (req.method === 'OPTIONS') {
        res.statusCode = 204
        res.end()
        return
      }

      if (req.method === 'GET') {
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(scriptsState))
        return
      }

      if (req.method === 'POST') {
        let body = ''
        req.on('data', (chunk: Buffer) => {
          body += chunk.toString()
        })
        req.on('end', () => {
          try {
            const data = JSON.parse(body)
            scriptsState = { ...data, updatedAt: Date.now() }
            res.statusCode = 200
            res.end('ok')
          }
          catch {
            res.statusCode = 400
            res.end('invalid json')
          }
        })
        return
      }

      res.statusCode = 405
      res.end('method not allowed')
    })
  })
}

// -- Proxy devtools data --

export interface ProxyDevtoolsScript {
  registryKey: string
  label: string
  logo: string
  category: string
  configKey: string
  mechanism: 'bundle-rewrite-intercept' | 'config-injection-proxy'
  hasAutoInject: boolean
  autoInjectField?: string
  hasPostProcess: boolean
  privacy: { ip: boolean, userAgent: boolean, language: boolean, screen: boolean, timezone: boolean, hardware: boolean }
  privacyLevel: 'full' | 'partial' | 'none'
  domains: string[]
}

export interface ProxyDevtoolsData {
  enabled: boolean
  proxyPrefix: string
  privacyMode: string
  scripts: ProxyDevtoolsScript[]
  totalDomains: number
}

function computeDevtoolsPrivacyLevel(privacy: Record<string, boolean>): 'full' | 'partial' | 'none' {
  const flags = Object.values(privacy)
  if (flags.every(Boolean))
    return 'full'
  if (flags.some(Boolean))
    return 'partial'
  return 'none'
}

export function buildDevtoolsEntry(
  key: string,
  script: RegistryScript,
  configKey: string,
  proxyConfig: ProxyConfig,
): ProxyDevtoolsScript {
  const privacy = proxyConfig.privacy as Record<string, boolean>
  const normalizedPrivacy = {
    ip: !!privacy.ip,
    userAgent: !!privacy.userAgent,
    language: !!privacy.language,
    screen: !!privacy.screen,
    timezone: !!privacy.timezone,
    hardware: !!privacy.hardware,
  }
  const logo = script.logo
  const logoStr = typeof logo === 'object' ? (logo.dark || logo.light) : (logo || '')

  return {
    registryKey: key,
    label: script.label || key,
    logo: logoStr,
    category: script.category || 'unknown',
    configKey,
    mechanism: script.src === false ? 'config-injection-proxy' : 'bundle-rewrite-intercept',
    hasAutoInject: !!proxyConfig.autoInject,
    autoInjectField: proxyConfig.autoInject?.configField,
    hasPostProcess: !!(proxyConfig.sdkPatches?.length),
    privacy: normalizedPrivacy,
    privacyLevel: computeDevtoolsPrivacyLevel(normalizedPrivacy),
    domains: [...proxyConfig.domains],
  }
}

export function buildDevtoolsData(
  proxyPrefix: string,
  privacyLabel: string,
  scripts: ProxyDevtoolsScript[],
): ProxyDevtoolsData {
  const allDomains = new Set<string>()
  for (const s of scripts) {
    for (const d of s.domains)
      allDomains.add(d)
  }
  return {
    enabled: true,
    proxyPrefix,
    privacyMode: privacyLabel,
    scripts,
    totalDomains: allDomains.size,
  }
}
