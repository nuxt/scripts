import { defineEventHandler, setResponseHeader } from 'h3'
import { useRuntimeConfig } from '#imports'
import { parseURL } from 'ufo'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const proxyConfig = config['nuxt-scripts-proxy'] as { routes: Record<string, string> } | undefined
  const swTemplate = (config['nuxt-scripts'] as any)?.swTemplate as string || ''
  const routes = proxyConfig?.routes || {}

  // Convert routes to SW intercept rules
  const rules = Object.entries(routes).map(([localPath, proxy]) => {
    // Use parseURL instead of raw regex to extract domain and path
    const url = parseURL(proxy.replace(/\*\*$/, ''))
    if (!url.host) return null

    return {
      pattern: url.host,
      pathPrefix: url.pathname || '',
      target: localPath.replace(/\/\*\*$/, ''),
    }
  }).filter(Boolean)

  // Inject rules into template
  const swCode = `const INTERCEPT_RULES = ${JSON.stringify(rules)};\n\n${swTemplate}`

  // Set proper headers for service worker
  setResponseHeader(event, 'Content-Type', 'application/javascript')
  setResponseHeader(event, 'Service-Worker-Allowed', '/')
  setResponseHeader(event, 'Cache-Control', 'no-cache')

  return swCode
})
