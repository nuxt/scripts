import { defineEventHandler } from 'h3'
import { defineCachedFunction, useNitroApp, useRuntimeConfig } from 'nitropack/runtime'

const getCachedValue = defineCachedFunction(() => 'ok')

export default defineEventHandler(async () => ({
  app: Boolean(useNitroApp()),
  cached: await getCachedValue(),
  config: Boolean(useRuntimeConfig()),
}))
