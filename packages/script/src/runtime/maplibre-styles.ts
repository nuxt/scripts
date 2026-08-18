const MAPLIBRE_STYLE_ID = 'nuxt-scripts-maplibre-styles'

interface MapLibreWorkerApi {
  setWorkerUrl: (value: string) => void
}

/**
 * Points MapLibre at its worker.
 *
 * MapLibre v6 resolves the worker from `import.meta.url`, which does not
 * survive bundling, so the URL has to be set explicitly. `?worker&url` is
 * required over plain `?url`: the worker imports its sibling
 * `maplibre-gl-shared.mjs`.
 *
 * @see https://maplibre.org/maplibre-gl-js/docs/#installation
 */
export async function configureMapLibreWorker(maplibre: MapLibreWorkerApi | undefined, workerUrl?: string): Promise<void> {
  if (!maplibre)
    return
  if (workerUrl) {
    maplibre.setWorkerUrl(workerUrl)
    return
  }
  const { default: bundledWorkerUrl } = await import('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url')
  maplibre.setWorkerUrl(bundledWorkerUrl)
}

/** Injects a custom MapLibre control and marker stylesheet once. */
export function ensureMapLibreStyles(stylesheetUrl: string): void {
  if (typeof document === 'undefined')
    return

  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = stylesheetUrl

  const stylesheets = document.querySelectorAll<HTMLLinkElement>('link[rel~="stylesheet"][href]')
  if ([...stylesheets].some(stylesheet => stylesheet.href === link.href))
    return

  const injectedStylesheets = document.querySelectorAll('[data-nuxt-scripts-maplibre]')
  link.id = injectedStylesheets.length ? `${MAPLIBRE_STYLE_ID}-${injectedStylesheets.length + 1}` : MAPLIBRE_STYLE_ID
  link.dataset.nuxtScriptsMaplibre = '1'

  document.head.append(link)
}
