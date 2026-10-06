import type { EventHandler } from 'nuxt/internal/server-default'
import { defineEventHandler as defineH3EventHandler } from 'h3'

export { useRuntimeConfig } from '#nuxt-scripts/nitro'
export { HTTPError } from 'h3'
// H3 2 provides the Web request and response used by Nuxt's portable helpers.
export * from 'nuxt/internal/server-default'
export function defineEventHandler<Result>(handler: EventHandler<Result>) {
  return defineH3EventHandler(event => handler(event))
}
