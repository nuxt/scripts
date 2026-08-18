/**
 * @vitest-environment happy-dom
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  configureMapLibreWorker,
  ensureMapLibreStyles,
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

  it('injects a custom stylesheet once', () => {
    const { append, styles } = mockStylesheetInsertion()

    ensureMapLibreStyles('https://cdn.example.com/maplibre.css')
    ensureMapLibreStyles('https://cdn.example.com/maplibre.css')

    expect(append).toHaveBeenCalledOnce()
    expect(styles[0]?.href).toBe('https://cdn.example.com/maplibre.css')
    expect(styles[0]?.integrity).toBeFalsy()
  })

  it('injects distinct stylesheet URLs once each', () => {
    const { append, styles } = mockStylesheetInsertion()

    ensureMapLibreStyles('https://cdn.example.com/a.css')
    ensureMapLibreStyles('https://cdn.example.com/b.css')
    ensureMapLibreStyles('https://cdn.example.com/b.css')

    expect(append).toHaveBeenCalledTimes(2)
    expect(styles.map(style => style.href)).toEqual([
      'https://cdn.example.com/a.css',
      'https://cdn.example.com/b.css',
    ])
  })

  it('configures a custom worker only after MapLibre has loaded', () => {
    expect(() => configureMapLibreWorker(undefined, '/maplibre-worker.js')).not.toThrow()

    const setWorkerUrl = vi.fn()
    configureMapLibreWorker({ setWorkerUrl } as any, '/maplibre-worker.js')

    expect(setWorkerUrl).toHaveBeenCalledWith('/maplibre-worker.js')
  })
})
