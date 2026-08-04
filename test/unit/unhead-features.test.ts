import { mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { hasUnheadSourceLessScriptLoader, hasUnheadSourceLessScriptLoaderFile } from '../../packages/script/src/unhead-features'

describe('unhead feature detection', () => {
  it('detects the source-less loader type export', () => {
    expect(hasUnheadSourceLessScriptLoader('export interface UseScriptLoaderInput<T> {}')).toBe(true)
    expect(hasUnheadSourceLessScriptLoader('export interface UseScriptInput {}')).toBe(false)
  })

  it('falls back when the advertised types path cannot be read', () => {
    const directoryPath = join(tmpdir(), `nuxt-scripts-unhead-types-${Date.now()}`)
    mkdirSync(directoryPath)

    expect(hasUnheadSourceLessScriptLoaderFile(directoryPath)).toBe(false)

    rmSync(directoryPath, { recursive: true })
  })
})
