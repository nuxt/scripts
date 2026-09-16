import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const REGISTRY_DIR = join(import.meta.dirname, '../../packages/script/src/runtime/registry')

/**
 * Guard for #852 / #855.
 *
 * A registry entry must not reach the global `Window` through an `extends` clause
 * (`interface Window extends XApi {}`). Interface declarations merge, so as soon as any other
 * package declares one of the same members — `@gtm-support/core` declaring
 * `Window.dataLayer?: DataLayerObject[]` is the case that started this — the merged `Window`
 * stops satisfying that clause. TypeScript then reports TS2430 at *every* `Window` augmentation
 * in the program, including the consumer's own, which are nowhere near the cause and which
 * `skipLibCheck` cannot silence because they live in the consumer's own `.ts` files.
 *
 * Declaring the members inline (`interface Window { xApi: XApi['xApi'] }`) is type-identical and
 * removes that failure mode: a real collision then surfaces as TS2687/TS2717 on the two
 * conflicting declarations, both of which are in `.d.ts` files and so fall under `skipLibCheck`
 * like any other dependency-vs-dependency disagreement.
 */
describe('registry global `Window` augmentations', () => {
  const entries = readdirSync(REGISTRY_DIR).filter(f => f.endsWith('.ts'))

  it('finds registry sources to check', () => {
    expect(entries.length).toBeGreaterThan(0)
  })

  it('never augments the global `Window` via an `extends` clause', () => {
    const offenders = entries.filter(file =>
      /\binterface\s+Window\s+extends\b/.test(readFileSync(join(REGISTRY_DIR, file), 'utf8')),
    )
    expect(offenders).toEqual([])
  })
})
