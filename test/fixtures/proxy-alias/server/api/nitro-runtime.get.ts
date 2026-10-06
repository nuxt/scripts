import { defineCachedFunction, useNitroApp } from '#nuxt-scripts/nitro'
import { defineEventHandler, useRuntimeConfig } from 'nuxt/server'

const getCachedValue = defineCachedFunction(() => 'ok')

export default defineEventHandler(async () => ({
  app: Boolean(useNitroApp()),
  cached: await getCachedValue(),
  config: Boolean(useRuntimeConfig()),
}))
