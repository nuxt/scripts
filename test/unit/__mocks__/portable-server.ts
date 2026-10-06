import type { EventHandler } from 'nuxt/internal/server-default'
import { defineEventHandler as defineH3EventHandler } from 'h3'
import { toPortableEvent } from '#test/portable-event'

export { useRuntimeConfig } from '#nuxt-scripts/nitro'
// Use Nuxt's real portable helpers and Nitro 2 event adapter in HTTP unit tests.
export * from 'nuxt/internal/server-default'
export function defineEventHandler<Result>(handler: EventHandler<Result>) {
  return defineH3EventHandler(event => handler(toPortableEvent(event)))
}
