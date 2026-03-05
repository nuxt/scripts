import type { RegistryScriptInput } from '#nuxt-scripts/types'
import { InstagramEmbedOptions } from './schemas'

export { InstagramEmbedOptions }

export type InstagramEmbedInput = RegistryScriptInput<typeof InstagramEmbedOptions, false, false, false>

/**
 * Extract the post shortcode from an Instagram URL
 */
export function extractInstagramShortcode(url: string): string | undefined {
  const match = url.match(/instagram\.com\/(?:p|reel|tv)\/([^/?]+)/)
  return match?.[1]
}
