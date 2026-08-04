import { describe, expect, it } from 'vitest'
import { hasUnheadSourceLessScriptLoader } from '../../packages/script/src/unhead-features'

describe('unhead feature detection', () => {
  it('detects the source-less loader type export', () => {
    expect(hasUnheadSourceLessScriptLoader('export interface UseScriptLoaderInput<T> {}')).toBe(true)
    expect(hasUnheadSourceLessScriptLoader('export interface UseScriptInput {}')).toBe(false)
  })
})
