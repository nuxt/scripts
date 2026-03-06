import { createError, getCookie, getHeader, setCookie } from 'h3'
import type { H3Event } from 'h3'

const COOKIE_NAME = '__nuxt_scripts_proxy'
const HEADER_NAME = 'x-nuxt-scripts-token'

// Generate a random token
function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

// Set CSRF cookie during SSR (called from the component's server-side render)
export function setProxyCsrfCookie(event: H3Event): string {
  let token = getCookie(event, COOKIE_NAME)
  if (!token) {
    token = generateToken()
    setCookie(event, COOKIE_NAME, token, {
      httpOnly: false, // must be readable by JS for double-submit pattern
      secure: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 86400,
    })
  }
  return token
}

// Validate CSRF token on proxy requests (double-submit cookie pattern)
export function validateProxyCsrf(event: H3Event): void {
  const cookie = getCookie(event, COOKIE_NAME)
  const header = getHeader(event, HEADER_NAME)

  if (!cookie || !header || cookie !== header) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Invalid proxy token',
    })
  }
}
