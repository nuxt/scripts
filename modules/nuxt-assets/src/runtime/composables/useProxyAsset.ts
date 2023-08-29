import { withQuery } from 'ufo'
import { useRuntimeConfig } from 'nuxt/app'

export function useProxyAsset(url: string) {
  const { routePrefix } = useRuntimeConfig().public['nuxt-assets']
  return withQuery(`${routePrefix}/proxy`, {
    url: encodeURIComponent(url),
  })
}
