import { object, optional, string } from '#nuxt-scripts-validator'
import type { RegistryScriptInput } from '#nuxt-scripts/types'

export interface XEmbedTweetData {
  id_str: string
  text: string
  created_at: string
  favorite_count: number
  conversation_count: number
  user: {
    name: string
    screen_name: string
    profile_image_url_https: string
    verified?: boolean
    is_blue_verified?: boolean
  }
  entities?: {
    media?: Array<{
      media_url_https: string
      type: string
      sizes: Record<string, { w: number, h: number }>
    }>
    urls?: Array<{
      url: string
      expanded_url: string
      display_url: string
    }>
  }
  photos?: Array<{
    url: string
    width: number
    height: number
  }>
  video?: {
    poster: string
    variants: Array<{ type: string, src: string }>
  }
  quoted_tweet?: XEmbedTweetData
  parent?: {
    user: {
      screen_name: string
    }
  }
}

export const XEmbedOptions = object({
  /**
   * The tweet ID to embed
   */
  tweetId: string(),
  /**
   * Optional: Custom API endpoint for fetching tweet data
   * @default '/api/_scripts/x-embed'
   */
  apiEndpoint: optional(string()),
  /**
   * Optional: Custom image proxy endpoint
   * @default '/api/_scripts/x-embed-image'
   */
  imageProxyEndpoint: optional(string()),
})

export type XEmbedInput = RegistryScriptInput<typeof XEmbedOptions, false, false, false>

/**
 * Proxy an X/Twitter image URL through the server
 */
export function proxyXImageUrl(url: string, proxyEndpoint = '/api/_scripts/x-embed-image'): string {
  const separator = proxyEndpoint.includes('?') ? '&' : '?'
  return `${proxyEndpoint}${separator}url=${encodeURIComponent(url)}`
}

/**
 * Format a tweet date for display
 */
export function formatTweetDate(dateString: string): string {
  const date = new Date(dateString)
  const time = date.toLocaleString('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
    timeZone: 'UTC',
  })
  const day = date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })
  return `${time} · ${day} ${date.getUTCDate()}, ${date.getUTCFullYear()}`
}

/**
 * Format a number for display (e.g., 1234 -> 1.2K)
 */
export function formatCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`
  }
  return count.toString()
}
