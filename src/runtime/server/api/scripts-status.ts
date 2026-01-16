import { defineEventHandler } from 'h3'
import { useRuntimeConfig } from '#imports'

/**
 * Dev-only endpoint that returns the current first-party configuration.
 * Available at /_scripts/status.json
 */
export default defineEventHandler(() => {
  const config = useRuntimeConfig()
  const scriptsConfig = config.public?.['nuxt-scripts-status'] as {
    enabled: boolean
    scripts: string[]
    routes: Record<string, string>
    collectPrefix: string
  } | undefined

  if (!scriptsConfig) {
    return {
      enabled: false,
      scripts: [],
      routes: {},
      collectPrefix: '/_scripts/c',
    }
  }

  return scriptsConfig
})
