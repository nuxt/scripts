import type { RegistryScriptInput } from '#nuxt-scripts/types'
import { scriptsPrefix, useRegistryScript } from '#nuxt-scripts/utils'
import { useScriptProxyUrl } from '../composables/useScriptProxyUrl'
import { GravatarOptions } from './schemas'

export { GravatarOptions } from './schemas'

export type GravatarInput = RegistryScriptInput<typeof GravatarOptions>

export interface GravatarApi {
  /**
   * Get a proxied avatar URL for a given SHA256 email hash.
   * When proxy mode is enabled, this routes through your server.
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

    const buildQuery = (overrides?: { size?: number, default?: string, rating?: string }) => ({
      s: overrides?.size ?? size,
      d: overrides?.default ?? defaultImg,
      r: overrides?.rating ?? rating,
    })

    return {
      scriptInput: {
        src: 'https://secure.gravatar.com/js/gprofiles.js',
      },
      schema: import.meta.dev ? GravatarOptions : undefined,
      scriptOptions: {
        use: () => {
          const prefix = scriptsPrefix()
          const proxyUrl = useScriptProxyUrl()
          const path = `${prefix}/proxy/gravatar`
          return {
            getAvatarUrl: (hash: string, overrides?: { size?: number, default?: string, rating?: string }) =>
              proxyUrl(path, { hash, ...buildQuery(overrides) }),
            getAvatarUrlFromEmail: (email: string, overrides?: { size?: number, default?: string, rating?: string }) =>
              proxyUrl(path, { email, ...buildQuery(overrides) }),
          }
        },
      },
    }
  }, _options)
}
