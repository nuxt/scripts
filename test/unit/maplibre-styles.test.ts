/**
 * @vitest-environment happy-dom
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ensureMapLibreStyles,
  MAPLIBRE_STYLESHEET_INTEGRITY,
  MAPLIBRE_STYLESHEET_URL,
} from '../../packages/script/src/runtime/maplibre-styles'

describe('mapLibre styles', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('injects the pinned stylesheet once with integrity metadata', () => {
    let style: HTMLLinkElement | undefined
    const append = vi.spyOn(document.head, 'append').mockImplementation((node) => {
      style = node as HTMLLinkElement
    })
    vi.spyOn(document, 'getElementById').mockImplementation(() => style ?? null)

    ensureMapLibreStyles()
    ensureMapLibreStyles()

    expect(append).toHaveBeenCalledOnce()
    expect(style?.href).toBe(MAPLIBRE_STYLESHEET_URL)
    expect(style?.integrity).toBe(MAPLIBRE_STYLESHEET_INTEGRITY)
    expect(style?.crossOrigin).toBe('anonymous')
  })

  it('does not apply pinned integrity metadata to a custom stylesheet', () => {
    let style: HTMLLinkElement | undefined
    vi.spyOn(document.head, 'append').mockImplementation((node) => {
      style = node as HTMLLinkElement
    })

    ensureMapLibreStyles('https://cdn.example.com/maplibre.css')

    expect(style?.href).toBe('https://cdn.example.com/maplibre.css')
    expect(style?.integrity).toBeFalsy()
  })
})
