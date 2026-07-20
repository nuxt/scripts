/**
 * @vitest-environment happy-dom
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  configureLeafletDefaultIcons,
  ensureLeafletStyles,
  LEAFLET_CSS,
  LEAFLET_DEFAULT_ICON_RETINA_URL,
  LEAFLET_DEFAULT_ICON_URL,
  LEAFLET_DEFAULT_SHADOW_URL,
} from '../../packages/script/src/runtime/leaflet-styles'

describe('leaflet styles', () => {
  afterEach(() => {
    document.querySelector('[data-nuxt-scripts-leaflet]')?.remove()
  })

  it('injects styles once and embeds all image assets', () => {
    ensureLeafletStyles()
    ensureLeafletStyles()

    const styles = document.querySelectorAll('[data-nuxt-scripts-leaflet]')
    expect(styles).toHaveLength(1)
    expect(styles[0]?.textContent).toBe(LEAFLET_CSS)
    expect(LEAFLET_CSS).toContain('data:image/png;base64,')
    expect(LEAFLET_CSS).not.toContain('url(images/')
  })

  it('configures Leaflet default icons without asset requests', () => {
    const mergeOptions = vi.fn()

    configureLeafletDefaultIcons({
      Icon: { Default: { mergeOptions } },
    } as any)

    expect(mergeOptions).toHaveBeenCalledWith({
      iconUrl: LEAFLET_DEFAULT_ICON_URL,
      iconRetinaUrl: LEAFLET_DEFAULT_ICON_RETINA_URL,
      shadowUrl: LEAFLET_DEFAULT_SHADOW_URL,
    })
  })
})
