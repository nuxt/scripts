import type { Page } from 'playwright-core'
import { createResolver } from '@nuxt/kit'
import { createPage, setup } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

/**
 * These tests run a real MapLibre instance in Chromium. A mocked `maplibregl.Map`
 * cannot reproduce style validation or delegated layer events, and mocked tests
 * passed while both were broken in a real app.
 *
 * Every style is inline, with no remote sources, glyphs or sprites.
 */
interface ErrorLog { broken: string[], valid: string[], map: string[] }

async function openMap(path: string): Promise<Page> {
  const page = await createPage(path)
  await page.waitForFunction(() => (window as any).__ready === true, undefined, { timeout: 20000 })
  return page
}

async function readErrors(page: Page): Promise<ErrorLog> {
  return JSON.parse(await page.locator('#errors').textContent() ?? '{}') as ErrorLog
}

/** Page coordinates of a longitude and latitude on the exposed map. */
async function pointOf(page: Page, lngLat: [number, number]): Promise<{ x: number, y: number }> {
  return page.evaluate((position) => {
    const map = (window as any).__map
    const rect = map.getCanvas().getBoundingClientRect()
    const point = map.project(position)
    return { x: rect.left + point.x, y: rect.top + point.y }
  }, lngLat)
}

async function waitForRenderedFeatures(page: Page, layers: string[], count: number): Promise<void> {
  await page.waitForFunction(({ layers, count }) => {
    const map = (window as any).__map
    return map.loaded() && map.queryRenderedFeatures({ layers }).length === count
  }, { layers, count }, { timeout: 20000 })
}

describe('maplibre in a real browser', { timeout: 60000 }, async () => {
  await setup({
    rootDir: resolve('../fixtures/maplibre'),
    browser: true,
  })

  it('renders on a real WebGL context', async ({ annotate }) => {
    const page = await openMap('/error')
    const renderer = await page.evaluate(() => {
      const gl = (window as any).__map.painter.context.gl as WebGLRenderingContext
      const info = gl.getExtension('WEBGL_debug_renderer_info')
      return info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER))
    })
    // Record which GL implementation ran the suite. CI has no GPU, so the log shows the fallback.
    await annotate(`WebGL renderer: ${renderer}`)
    console.warn(`[maplibre e2e] WebGL renderer: ${renderer}`)
    expect(renderer).toBeTruthy()
  })

  it('emits error for an invalid paint value on first add, and only from the owning component', async () => {
    const page = await openMap('/error')
    await page.waitForFunction(() => document.querySelector('#errors')?.textContent?.includes('broken'))
    await expect.poll(() => readErrors(page).then(log => log.broken.length)).toBeGreaterThan(0)

    const log = await readErrors(page)
    expect(log.broken.every(message => message.startsWith('layers.broken'))).toBe(true)
    expect(log.valid).toEqual([])
    // The raw layer's error reaches the map, and neither component claims it.
    expect(log.map.some(message => message.startsWith('layers.foreign'))).toBe(true)
    expect([...log.broken, ...log.valid].some(message => message.includes('foreign'))).toBe(false)
    expect(await page.evaluate(() => Boolean((window as any).__map.getLayer('broken')))).toBe(false)
  })

  it('emits error for an invalid paint value set on a live layer', async () => {
    const page = await openMap('/error')
    await expect.poll(() => page.evaluate(() => Boolean((window as any).__map.getLayer('valid')))).toBe(true)

    await page.click('#break-valid')

    await expect.poll(() => readErrors(page).then(log => log.valid)).toEqual([
      expect.stringMatching(/^layers\.valid\.paint\.circle-color/),
    ])
    const log = await readErrors(page)
    expect(log.broken.some(message => message.startsWith('layers.valid'))).toBe(false)
  })

  it('keeps a keyboard-operable canvas in the tab order without a nested landmark', async () => {
    const page = await createPage('/a11y')
    await page.waitForSelector('#static-map canvas.maplibregl-canvas')
    await page.waitForSelector('#pointer-map canvas.maplibregl-canvas')
    await page.waitForSelector('#keyboard-map canvas.maplibregl-canvas')

    const read = (root: string) => page.evaluate((selector) => {
      const canvas = document.querySelector(`${selector} canvas`)!
      return {
        regions: document.querySelectorAll(`${selector} [role="region"]`).length,
        role: canvas.getAttribute('role'),
        tabindex: canvas.getAttribute('tabindex'),
        ariaHidden: canvas.getAttribute('aria-hidden'),
        ariaLabel: canvas.getAttribute('aria-label'),
      }
    }, root)

    // Keyboard panning needs focus on the canvas, so it stays a tab stop.
    expect(await read('#keyboard-map')).toMatchObject({ regions: 1, role: null, tabindex: '0' })
    // Without the keyboard handler the canvas has nothing to operate.
    expect(await read('#pointer-map')).toEqual({ regions: 1, role: null, tabindex: '-1', ariaHidden: 'true', ariaLabel: null })
    expect(await read('#static-map')).toMatchObject({ regions: 0, role: null, tabindex: '-1', ariaLabel: null })

    await page.focus('#keyboard-map canvas')
    const before = await page.evaluate(() => document.querySelector('#keyboard-map canvas') === document.activeElement)
    expect(before).toBe(true)
  })

  it('follows the pointer between touching features in different layers', async () => {
    const page = await openMap('/hover')
    await waitForRenderedFeatures(page, ['clusters', 'sites'], 3)
    const hovered = () => page.locator('#hovered').textContent()
    const cursor = () => page.evaluate(() => (window as any).__map.getCanvas().style.cursor)

    const west = await pointOf(page, [-1.2, 0])
    const cluster = await pointOf(page, [0, 0])
    const east = await pointOf(page, [1.2, 0])

    await page.mouse.move(west.x, west.y, { steps: 4 })
    await expect.poll(hovered).toBe('west')
    expect(await cursor()).toBe('pointer')

    // The circles overlap, so the pointer never leaves the group on the way.
    await page.mouse.move(cluster.x, cluster.y, { steps: 8 })
    await expect.poll(hovered).toBe('cluster')

    await page.mouse.move(east.x, east.y, { steps: 8 })
    await expect.poll(hovered).toBe('east')

    await page.mouse.move(east.x, east.y + 80, { steps: 4 })
    await expect.poll(hovered).toBe('none')
    expect(await cursor()).toBe('')

    const log = JSON.parse(await page.locator('#log').textContent() ?? '{}')
    // The group edges fired once each, which is why `mousemove` has to carry the hover.
    expect(log).toMatchObject({ mouseenter: 1, mouseleave: 1 })
  })

  it('emits dblclick and lets the consumer replace the default zoom', async () => {
    const page = await openMap('/hover')
    await waitForRenderedFeatures(page, ['clusters', 'sites'], 3)
    const west = await pointOf(page, [-1.2, 0])

    await page.mouse.dblclick(west.x, west.y)

    await expect.poll(() => page.locator('#log').textContent()).toContain('"dblclick":1')
    await page.waitForFunction(() => {
      const map = (window as any).__map
      return !map.isMoving() && map.getZoom() === 6
    }, undefined, { timeout: 5000 })
    const center = await page.evaluate(() => (window as any).__map.getCenter().toArray() as [number, number])
    expect(center[0]).toBeCloseTo(-1.2, 3)
  })

  it.each(['diff', 'full'])('emits sourceready after a %s style swap so feature state can be restored', async (mode) => {
    const page = await openMap('/style-swap')
    const readLog = async () => JSON.parse(await page.locator('#log').textContent() ?? '{}') as { styleload: boolean[], sourceready: string[] }
    await expect.poll(() => readLog().then(log => log.sourceready.length)).toBeGreaterThan(0)
    const before = (await readLog()).sourceready.length

    await page.click(`#swap-${mode}`)

    await expect.poll(() => readLog().then(log => log.sourceready.length)).toBe(before + 1)
    const log = await readLog()
    expect(log.sourceready.at(-1)).toBe('{"selected":true}')
    // `styleload` fires before the component re-adds its source.
    expect(log.styleload.at(-1)).toBe(false)

    await page.waitForFunction(() => (window as any).__map.loaded())
    const state = await page.evaluate(() => (window as any).__map.getFeatureState({ source: 'points', id: 2 }))
    expect(state).toEqual({ selected: true })
  })
})
