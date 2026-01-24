import { boolean, object, optional, string } from '#nuxt-scripts-validator'
import type { RegistryScriptInput } from '#nuxt-scripts/types'

export const InstagramEmbedOptions = object({
  /**
   * The Instagram post URL to embed
   * e.g., https://www.instagram.com/p/ABC123/
   */
  postUrl: string(),
  /**
   * Whether to include captions in the embed
   * @default true
   */
  captions: optional(boolean()),
  /**
   * Custom API endpoint for fetching embed HTML
   * @default '/api/_scripts/instagram-embed'
   */
  apiEndpoint: optional(string()),
})

export type InstagramEmbedInput = RegistryScriptInput<typeof InstagramEmbedOptions, false, false, false>

/**
 * Extract the post shortcode from an Instagram URL
 */
export function extractInstagramShortcode(url: string): string | undefined {
  const match = url.match(/instagram\.com\/(?:p|reel|tv)\/([^/?]+)/)
  return match?.[1]
}
