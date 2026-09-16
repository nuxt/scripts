import type { Page } from 'playwright-core'
import { appendFileSync } from 'node:fs'
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
    // Record which GL implementation ran the suite. CI has no GPU, so it shows in the job summary.
    await annotate(`WebGL renderer: ${renderer}`)
    if (process.env.GITHUB_STEP_SUMMARY)
      appendFileSync(process.env.GITHUB_STEP_SUMMARY, `MapLibre e2e WebGL renderer: \`${renderer}\`\n`)
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
})
