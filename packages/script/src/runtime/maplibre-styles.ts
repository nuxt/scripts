export const MAPLIBRE_STYLESHEET_URL = 'https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.css'
export const MAPLIBRE_STYLESHEET_INTEGRITY = 'sha384-uTttxo/aOKbdE5RlD/SPzSDoDmNvGlUYPjONi2MN/b7c9HPSvW07OIuyP7uL6jxK'

const MAPLIBRE_STYLE_ID = 'nuxt-scripts-maplibre-styles'

/** Injects MapLibre's required control and marker stylesheet once. */
export function ensureMapLibreStyles(stylesheetUrl = MAPLIBRE_STYLESHEET_URL): void {
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

  if (stylesheetUrl === MAPLIBRE_STYLESHEET_URL) {
    link.integrity = MAPLIBRE_STYLESHEET_INTEGRITY
    link.crossOrigin = 'anonymous'
  }

  document.head.append(link)
}
