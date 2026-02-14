import { defineEventHandler } from 'h3'
import { useRuntimeConfig } from '#imports'
import { escapeRegExp } from '../../utils/pure'

interface HealthCheckResult {
  script: string
  route: string
  target: string
  status: 'ok' | 'error' | 'skipped'
  latency?: number
  error?: string
}

/**
 * Dev-only endpoint that verifies first-party proxy routes are working.
 * Available at /_scripts/health.json
 *
 * Tests a sample request to each proxy route to verify connectivity.
 */
export default defineEventHandler(async (_event) => {
  const config = useRuntimeConfig()
  const scriptsConfig = config.public?.['nuxt-scripts-status'] as {
    enabled: boolean
    scripts: string[]
    routes: Record<string, string>
    collectPrefix: string
  } | undefined

  if (!scriptsConfig?.enabled) {
    return {
      status: 'disabled',
      message: 'First-party mode is not enabled',
      checks: [],
    }
  }

  const checks: HealthCheckResult[] = []

  // Build regex dynamically from collectPrefix to extract script name
  const escapedPrefix = escapeRegExp(scriptsConfig.collectPrefix)
  const scriptNameRegex = new RegExp(`${escapedPrefix}\\/([^/]+)`)

  // Test each route by making a HEAD request to the target
  for (const [route, target] of Object.entries(scriptsConfig.routes)) {
    // Extract script name from route (e.g., /_scripts/c/ga/** -> ga)
    const scriptMatch = route.match(scriptNameRegex)
    const scriptName = scriptMatch?.[1] || 'unknown'

    // Convert wildcard target to a testable URL
    const testUrl = target.replace('/**', '/')

    const start = Date.now()

    const result = await fetch(testUrl, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    })
      .then((res) => {
        const latency = Date.now() - start
        return {
          script: scriptName,
          route,
          target: testUrl,
          status: res.ok ? 'ok' : 'error',
          latency,
          error: res.ok ? undefined : `HTTP ${res.status}`,
        } satisfies HealthCheckResult
      })
      .catch((err) => {
        return {
          script: scriptName,
          route,
          target: testUrl,
          status: 'error',
          error: err.message || 'Connection failed',
        } satisfies HealthCheckResult
      })

    checks.push(result)
  }

  const allOk = checks.every(c => c.status === 'ok')
  const checksWithLatency = checks.filter(c => typeof c.latency === 'number')
  const avgLatency = checksWithLatency.length > 0
    ? checksWithLatency.reduce((sum, c) => sum + c.latency!, 0) / checksWithLatency.length
    : 0

  return {
    status: allOk ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    summary: {
      total: checks.length,
      ok: checks.filter(c => c.status === 'ok').length,
      errors: checks.filter(c => c.status === 'error').length,
      avgLatency: Math.round(avgLatency),
    },
    checks,
  }
})
