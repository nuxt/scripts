import { defineEventHandler, setResponseStatus } from 'nuxt/server'

export default defineEventHandler((event) => {
  setResponseStatus(event, 204)
  return null
})
