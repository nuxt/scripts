import { defineEventHandler } from '#nuxt-scripts/h3'
import { defineCachedFunction, useNitroApp, useRuntimeConfig } from '#nuxt-scripts/nitro'

const getCachedValue = defineCachedFunction(() => 'ok')

export default defineEventHandler(async () => ({
  app: Boolean(useNitroApp()),
  cached: await getCachedValue(),
  config: Boolean(useRuntimeConfig()),
}))
