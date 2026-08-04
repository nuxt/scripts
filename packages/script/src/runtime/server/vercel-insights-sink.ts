import { defineEventHandler, setResponseStatus } from '#nuxt-scripts/h3'

export default defineEventHandler((event) => {
  setResponseStatus(event, 204)
  return null
})
