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
 * - If no secret is configured: passes through (signing not yet enabled).
 *   This allows shipping handler wiring before components emit signed URLs.
 *   Once `NUXT_SCRIPTS_PROXY_SECRET` is set, verification is enforced.
 * - If a secret IS configured and the request's signature is invalid: 403.
 * - Otherwise, delegates to the wrapped handler.
 *
 * The outer wrapper runs before any handler logic, so unauthorized requests
 * never reach the upstream fetch and cannot consume API quota.
 */

import type { EventHandler, EventHandlerRequest, EventHandlerResponse } from 'h3'
import { createError, defineEventHandler } from 'h3'
import { useRuntimeConfig } from 'nitropack/runtime'
import { verifyProxyRequest } from './sign'

export function withSigning<Req extends EventHandlerRequest = EventHandlerRequest, Res extends EventHandlerResponse = EventHandlerResponse>(
  handler: EventHandler<Req, Res>,
): EventHandler<Req, Res> {
  return defineEventHandler<Req>(async (event) => {
    const runtimeConfig = useRuntimeConfig(event)
    const scriptsConfig = runtimeConfig['nuxt-scripts'] as { proxySecret?: string, pageTokenMaxAge?: number } | undefined
    const secret = scriptsConfig?.proxySecret

    // No secret configured: pass through without verification. This lets the
    // handler wiring ship before components emit signed URLs. Users opt in to
    // enforcement by setting NUXT_SCRIPTS_PROXY_SECRET.
    if (!secret)
      return handler(event) as Res

    if (!verifyProxyRequest(event, secret, scriptsConfig?.pageTokenMaxAge)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Invalid signature',
      })
    }

    return handler(event) as Res
  })
}
