import { defineEventHandler } from 'h3'

const getCachedValue = defineCachedFunction(() => 'ok')

export default defineEventHandler(async () => ({
  app: Boolean(useNitroApp()),
  cached: await getCachedValue(),
  config: Boolean(useRuntimeConfig()),
}))
