/**
 * Middleware wrapper that enforces HMAC signature verification on a proxy handler.
 *
 * Usage:
 * ```ts
 * export default withSigning(defineEventHandler(async (event) => {
 *   // ... handler logic
 * }))
 * ```
 *
 * Behavior:
 * - Reads `runtimeConfig.nuxt-scripts.proxySecret` (server-only).
 * - If no secret is configured: 500 — the module is misconfigured.
 * - If the request's `sig` param is missing, malformed, or doesn't match: 403.
 * - Otherwise, delegates to the wrapped handler.
 *
 * The outer wrapper runs before any handler logic, so misconfigured / unauthorized
 * requests never reach the upstream fetch and cannot consume API quota.
 */

import type { EventHandler, EventHandlerRequest, EventHandlerResponse } from 'h3'
import { useRuntimeConfig } from '#imports'
import { createError, defineEventHandler } from 'h3'
import { verifyProxyRequest } from './sign'

export function withSigning<Req extends EventHandlerRequest = EventHandlerRequest, Res extends EventHandlerResponse = EventHandlerResponse>(
  handler: EventHandler<Req, Res>,
): EventHandler<Req, Res> {
  return defineEventHandler<Req>(async (event) => {
    const runtimeConfig = useRuntimeConfig(event)
    const secret = (runtimeConfig['nuxt-scripts'] as { proxySecret?: string } | undefined)?.proxySecret

    if (!secret) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Proxy secret not configured',
        message: 'NUXT_SCRIPTS_PROXY_SECRET is not set. Run `npx @nuxt/scripts generate-secret` and set the env var.',
      })
    }

    if (!verifyProxyRequest(event, secret)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Invalid signature',
      })
    }

    return handler(event) as Res
  })
}
