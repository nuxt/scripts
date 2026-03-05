import type { RegistryScriptInput } from '#nuxt-scripts/types'
import { useRegistryScript } from '#nuxt-scripts/utils'
import { GravatarOptions } from './schemas'

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
