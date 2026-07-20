/**
 * @vitest-environment happy-dom
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  configureMapLibreWorker,
  ensureMapLibreStyles,
  MAPLIBRE_STYLESHEET_INTEGRITY,
  MAPLIBRE_STYLESHEET_URL,
} from '../../packages/script/src/runtime/maplibre-styles'

describe('mapLibre styles', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  function mockStylesheetInsertion() {
    const styles: HTMLLinkElement[] = []
    const append = vi.spyOn(document.head, 'append').mockImplementation((node) => {
      styles.push(node as HTMLLinkElement)
    })
    vi.spyOn(document, 'querySelectorAll').mockImplementation((selector) => {
      if (selector === 'link[rel~="stylesheet"][href]')
        return styles as unknown as NodeListOf<Element>
      return styles.filter(style => style.dataset.nuxtScriptsMaplibre) as unknown as NodeListOf<Element>
    })
    return { append, styles }
  }

  it('injects the pinned stylesheet once with integrity metadata', () => {
    const { append, styles } = mockStylesheetInsertion()

    ensureMapLibreStyles()
    ensureMapLibreStyles()

    expect(append).toHaveBeenCalledOnce()
    expect(styles[0]?.href).toBe(MAPLIBRE_STYLESHEET_URL)
    expect(styles[0]?.integrity).toBe(MAPLIBRE_STYLESHEET_INTEGRITY)
    expect(styles[0]?.crossOrigin).toBe('anonymous')
  })

  it('does not apply pinned integrity metadata to a custom stylesheet', () => {
    const { styles } = mockStylesheetInsertion()

    ensureMapLibreStyles('https://cdn.example.com/maplibre.css')

    expect(styles[0]?.href).toBe('https://cdn.example.com/maplibre.css')
    expect(styles[0]?.integrity).toBeFalsy()
  })

  it('injects distinct stylesheet URLs once each', () => {
    const { append, styles } = mockStylesheetInsertion()

    ensureMapLibreStyles()
    ensureMapLibreStyles('https://cdn.example.com/maplibre.css')
    ensureMapLibreStyles('https://cdn.example.com/maplibre.css')

    expect(append).toHaveBeenCalledTimes(2)
    expect(styles.map(style => style.href)).toEqual([
      MAPLIBRE_STYLESHEET_URL,
      'https://cdn.example.com/maplibre.css',
    ])
  })

  it('configures a custom worker only after MapLibre has loaded', () => {
    expect(() => configureMapLibreWorker(undefined, '/maplibre-worker.js')).not.toThrow()

    const setWorkerUrl = vi.fn()
    configureMapLibreWorker({ setWorkerUrl } as any, '/maplibre-worker.js')

    expect(setWorkerUrl).toHaveBeenCalledWith('/maplibre-worker.js')
  })
})
