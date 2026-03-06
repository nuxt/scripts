import { defineEventHandler } from 'h3'
import { setProxyCsrfCookie } from '../utils/proxy-csrf'

export default defineEventHandler((event) => {
  setProxyCsrfCookie(event)
})
