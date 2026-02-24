import { useRegistryScript } from '#nuxt-scripts/utils'
import type { RegistryScriptInput } from '#nuxt-scripts/types'
import { object, optional, number, string } from '#nuxt-scripts-validator'

export const GravatarOptions = object({
  /**
   * Cache duration for proxied avatar images in seconds.
   * @default 3600
   */
  cacheMaxAge: optional(number()),
  /**
   * Default image to show when no Gravatar exists.
   * @see https://docs.gravatar.com/general/images/#default-image
   * @default 'mp'
   */
  default: optional(string()),
  /**
   * Avatar size in pixels (1-2048).
   * @default 80
   */
  size: optional(number()),
  /**
   * Content rating filter.
   * @default 'g'
   */
  rating: optional(string()),
})

export type GravatarInput = RegistryScriptInput<typeof GravatarOptions>

export interface GravatarApi {
  /**
   * Get a proxied avatar URL for a given SHA256 email hash.
   * When firstParty mode is enabled, this routes through your server.
   */
  getAvatarUrl: (hash: string, options?: { size?: number, default?: string, rating?: string }) => string
  /**
   * Get a proxied avatar URL using the server-side hashing endpoint.
   * The email is sent to YOUR server (not Gravatar) for hashing.
   * Only available when the gravatar proxy is enabled.
   */
  getAvatarUrlFromEmail: (email: string, options?: { size?: number, default?: string, rating?: string }) => string
}

export function useScriptGravatar<T extends GravatarApi>(_options?: GravatarInput) {
  return useRegistryScript<T, typeof GravatarOptions>(_options?.key || 'gravatar', (options) => {
    const size = options?.size ?? 80
    const defaultImg = options?.default ?? 'mp'
    const rating = options?.rating ?? 'g'

    const buildQuery = (overrides?: { size?: number, default?: string, rating?: string }) => {
      const params = new URLSearchParams()
      params.set('s', String(overrides?.size ?? size))
      params.set('d', overrides?.default ?? defaultImg)
      params.set('r', overrides?.rating ?? rating)
      return params.toString()
    }

    return {
      scriptInput: {
        src: 'https://secure.gravatar.com/js/gprofiles.js',
      },
      schema: import.meta.dev ? GravatarOptions : undefined,
      scriptOptions: {
        use: () => ({
          getAvatarUrl: (hash: string, overrides?: { size?: number, default?: string, rating?: string }) => {
            return `/_scripts/gravatar-proxy?hash=${encodeURIComponent(hash)}&${buildQuery(overrides)}`
          },
          getAvatarUrlFromEmail: (email: string, overrides?: { size?: number, default?: string, rating?: string }) => {
            return `/_scripts/gravatar-proxy?email=${encodeURIComponent(email)}&${buildQuery(overrides)}`
          },
        }),
      },
    }
  }, _options)
}
