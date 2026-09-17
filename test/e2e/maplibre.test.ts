import type { Page } from 'playwright-core'
import { createResolver } from '@nuxt/kit'
import { createPage } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'
import { setupFixture } from '../utils/setup-fixture'

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
  await setupFixture({
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

  describe('bounds', () => {
    interface Camera { center: [number, number], zoom: number, bearing: number, bounds: [number, number, number, number] }

    function readCamera(page: Page, name: 'framed' | 'both'): Promise<Camera> {
      return page.evaluate((key) => {
        const map = (window as any).__maps[key]
        const bounds = map.getBounds()
        return {
          center: map.getCenter().toArray(),
          zoom: map.getZoom(),
          bearing: map.getBearing(),
          bounds: [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()],
        }
      }, name)
    }

    /**
     * True when the visible area contains the box `[west, south, east, north]`.
     * A fit without padding touches the box edge, so the check allows float error.
     */
    function contains(visible: Camera['bounds'], box: Camera['bounds']): boolean {
      const error = 1e-6
      return visible[0] <= box[0] + error && visible[1] <= box[1] + error
        && visible[2] >= box[2] - error && visible[3] >= box[3] - error
    }

    it('frames the initial camera on bounds without a center', async () => {
      const page = await openMap('/bounds')
      const camera = await readCamera(page, 'framed')

      expect(contains(camera.bounds, [10, 10, 20, 20])).toBe(true)
      expect(camera.center[0]).toBeCloseTo(15, 0)
      // The fit keeps the bearing prop. MapLibre's own fit resets it to 0.
      expect(camera.bearing).toBe(30)
    })

    it('lets bounds override the initial center and zoom', async () => {
      const page = await openMap('/bounds')
      const camera = await readCamera(page, 'both')

      expect(contains(camera.bounds, [-20, -10, -10, 0])).toBe(true)
      expect(camera.center[0]).toBeCloseTo(-15, 0)
      expect(camera.zoom).toBeGreaterThan(2)
    })

    it('fits again only when the bounds coordinates change', async () => {
      const page = await openMap('/bounds')

      await page.click('#move-bounds')
      await expect.poll(() => readCamera(page, 'framed').then(camera => camera.center[0])).toBeCloseTo(35, 0)
      expect(contains((await readCamera(page, 'framed')).bounds, [30, 30, 40, 40])).toBe(true)

      // The user moves the camera away. A new array with the same coordinates keeps it there.
      await page.evaluate(() => (window as any).__maps.framed.jumpTo({ center: [0, 0] }))
      await page.click('#same-bounds')
      await page.waitForTimeout(200)
      const camera = await readCamera(page, 'framed')
      expect(camera.center[0]).toBeCloseTo(0, 3)
      expect(camera.center[1]).toBeCloseTo(0, 3)
    })

    it('fits again when removed bounds come back with the same coordinates', async () => {
      const page = await openMap('/bounds')
      await page.evaluate(() => (window as any).__maps.both.jumpTo({ center: [60, 20] }))

      await page.click('#remove-bounds')
      await page.waitForTimeout(200)
      // Removing bounds keeps the camera where it is.
      expect((await readCamera(page, 'both')).center[0]).toBeCloseTo(60, 3)

      await page.click('#restore-bounds')
      await expect.poll(() => readCamera(page, 'both').then(camera => camera.center[0])).toBeCloseTo(-15, 0)
    })
  })

  describe('cluster options', () => {
    interface ClusterLog { addSource: number, removeSource: number, errors: string[] }
    const clusterLayers = ['clusters', 'points']

    async function openClusters(): Promise<{ page: Page, readLog: () => Promise<ClusterLog> }> {
      const page = await openMap('/cluster')
      const readLog = async () => JSON.parse(await page.locator('#log').textContent() ?? '{}') as ClusterLog
      // A radius of 1 pixel leaves all 12 points unclustered.
      await waitForRenderedFeatures(page, clusterLayers, 12)
      return { page, readLog }
    }

    it('updates the cluster radius in place without rebuilding the source', async () => {
      const { page, readLog } = await openClusters()
      const before = await readLog()

      await page.click('#radius-merge')
      // A radius of 50 pixels merges each group of four into one cluster.
      await waitForRenderedFeatures(page, clusterLayers, 3)
      expect(await page.evaluate(() => (window as any).__map.getSource('places').getClusterOptions().clusterRadius)).toBe(50)

      await page.click('#radius-split')
      await waitForRenderedFeatures(page, clusterLayers, 12)

      const after = await readLog()
      expect(after.addSource - before.addSource).toBe(0)
      expect(after.removeSource - before.removeSource).toBe(0)
      expect(after.errors).toEqual([])
    })

    it('applies the last radius when a second change arrives before the first finishes', async () => {
      const { page, readLog } = await openClusters()
      const before = await readLog()

      await page.click('#radius-burst')
      // 400 pixels would merge all three groups into one cluster. 50 wins.
      await waitForRenderedFeatures(page, clusterLayers, 3)
      await page.waitForTimeout(300)
      await waitForRenderedFeatures(page, clusterLayers, 3)

      const after = await readLog()
      expect(after.addSource - before.addSource).toBe(0)
      expect(after.errors).toEqual([])
    })

    it('reports a data failure that fires while a superseded cluster update runs', async () => {
      const { page, readLog } = await openClusters()
      const before = await readLog()

      // The first radius starts in the worker. The broken data and the
      // superseding radius queue behind it, so the data failure fires while
      // MapLibre is still running the superseded update's worker round.
      await page.click('#burst-data')
      await waitForRenderedFeatures(page, clusterLayers, 3)

      const after = await readLog()
      expect(after.errors.length).toBe(before.errors.length + 1)
      expect(after.errors.at(-1)).toMatch(/missing-points\.geojson/)
      expect(after.addSource).toBe(before.addSource)

      // The data failure is not a cluster failure, so the next radius change
      // still updates the source in place.
      await page.click('#radius-split')
      await waitForRenderedFeatures(page, clusterLayers, 12)
      expect((await readLog()).addSource).toBe(before.addSource)
    })

    /**
     * A 404 data URL leaves the worker without a cluster index. MapLibre then
     * fails the cluster update inside the worker, fires a map `error` event and
     * resolves the `setClusterOptions()` promise. It does not reject.
     */
    async function openBrokenClusters(): Promise<{ page: Page, readLog: () => Promise<ClusterLog> }> {
      const page = await openMap('/cluster?data=missing')
      const readLog = async () => JSON.parse(await page.locator('#log').textContent() ?? '{}') as ClusterLog
      // The failed data load reports its own error first.
      await expect.poll(() => readLog().then(log => log.errors.length)).toBeGreaterThan(0)
      await page.waitForTimeout(300)
      return { page, readLog }
    }

    it('emits a worker failure once and rebuilds on the next change', async () => {
      const { page, readLog } = await openBrokenClusters()
      const before = await readLog()

      await page.click('#radius-merge')
      await expect.poll(() => readLog().then(log => log.errors.length)).toBe(before.errors.length + 1)
      await page.waitForTimeout(300)
      const failed = await readLog()
      expect(failed.errors.length).toBe(before.errors.length + 1)
      expect(failed.errors.at(-1)).toMatch(/updateClusterOptions/)
      expect(failed.addSource).toBe(before.addSource)

      // The failed options never applied, so the next change rebuilds the source.
      await page.click('#radius-split')
      await expect.poll(() => readLog().then(log => log.addSource)).toBe(before.addSource + 1)
    })

    it('reports a cluster failure whose round runs during tile events and rebuilds next', async () => {
      const { page, readLog } = await openBrokenClusters()
      const before = await readLog()

      // The update fails because the source data is missing. Tile loads of the
      // source fire their own dataloading and data events while the update's
      // worker round is still running.
      await page.click('#radius-merge-tile-events')
      await expect.poll(() => readLog().then(log => log.errors.length)).toBe(before.errors.length + 1)
      await page.waitForTimeout(300)
      const failed = await readLog()
      expect(failed.errors.length).toBe(before.errors.length + 1)
      expect(failed.errors.at(-1)).toMatch(/updateClusterOptions/)
      expect(failed.addSource).toBe(before.addSource)

      // The tile events must not keep the failed options marked as applied,
      // so the next cluster-only change rebuilds the source.
      await page.click('#radius-split')
      await expect.poll(() => readLog().then(log => log.addSource)).toBe(before.addSource + 1)
    })

    it('ignores the worker failure of a superseded cluster update', async () => {
      const { page, readLog } = await openBrokenClusters()
      const before = await readLog()

      // 400 starts in the worker. 50 arrives before it fails, so only 50 may report.
      await page.click('#radius-burst')
      await expect.poll(() => readLog().then(log => log.errors.length)).toBeGreaterThan(before.errors.length)
      await page.waitForTimeout(500)

      const after = await readLog()
      expect(after.errors.length).toBe(before.errors.length + 1)
      expect(after.addSource).toBe(before.addSource)
    })

    it('rebuilds the source for a cluster option MapLibre cannot update in place', async () => {
      const { page, readLog } = await openClusters()
      await page.click('#radius-merge')
      await waitForRenderedFeatures(page, clusterLayers, 3)
      const before = await readLog()

      await page.click('#min-points')
      // Four points no longer make a cluster, so all 12 points show again.
      await waitForRenderedFeatures(page, clusterLayers, 12)

      const after = await readLog()
      expect(after.removeSource - before.removeSource).toBe(1)
      expect(after.addSource - before.addSource).toBe(1)
    })
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
