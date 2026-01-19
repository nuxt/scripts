import { describe, expectTypeOf, it } from 'vitest'

// Import from the generated augments file to test it's a valid module
// This tests the fix for issue #570 - the file must have `export {}`
// to be treated as a module, otherwise the augmentations break base exports
import type {} from '../../test/fixtures/extend-registry/.nuxt/types/nuxt-scripts-augments'

// Import base types to verify they're still accessible after augmentation
import type {
  NuxtUseScriptOptions,
  ScriptRegistry,
  UseScriptContext,
} from '../../src/runtime/types'

// Issue #570: When adding a new script to registry via hooks, the generated
// nuxt-scripts-augments.d.ts was missing `export {}`, causing TypeScript to
// treat it as a script instead of a module. This broke imports from
// #nuxt-scripts/types because the module augmentation interfered with
// the original module's exports.
describe('extend-registry fixture types (issue #570)', () => {
  it('base types remain accessible after augmentation', () => {
    // The core issue in #570 was that after augmentation, the base exports
    // from #nuxt-scripts/types became inaccessible
    expectTypeOf<UseScriptContext<{ foo: string }>>().not.toBeAny()
    expectTypeOf<NuxtUseScriptOptions>().not.toBeAny()
    expectTypeOf<ScriptRegistry>().not.toBeAny()
  })

  it('ScriptRegistry maintains known properties', () => {
    // Ensure base registry entries still work
    expectTypeOf<ScriptRegistry>().toHaveProperty('googleAnalytics')
    expectTypeOf<ScriptRegistry>().toHaveProperty('clarity')
  })
})
