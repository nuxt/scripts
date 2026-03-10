import type { RegistryScriptInput } from '#nuxt-scripts/types'
import { InstagramEmbedOptions } from './schemas'

export { InstagramEmbedOptions }

export type InstagramEmbedInput = RegistryScriptInput<typeof InstagramEmbedOptions, false, false, false>

const INSTAGRAM_SHORTCODE_RE = /instagram\.com\/(?:p|reel|tv)\/([^/?]+)/

/**
 * Extract the post shortcode from an Instagram URL
 */
export function extractInstagramShortcode(url: string): string | undefined {
  const match = url.match(INSTAGRAM_SHORTCODE_RE)
  return match?.[1]
}
