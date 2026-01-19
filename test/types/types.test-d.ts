import { describe, expectTypeOf, it } from 'vitest'
import type { ModuleOptions } from '../../src/module'
import type {
  NuxtUseScriptOptions,
  RegistryScriptInput,
  ScriptRegistry,
  UseScriptContext,
} from '../../src/runtime/types'

describe('module options registry', () => {
  it('registry entries are typed', () => {
    // Check specific registry keys have proper types (not any)
    // Using specific keys because the index signature `[key: \`${string}-npm\`]`
    // causes `keyof ScriptRegistry` to include template literals which resolve to any
    type Registry = NonNullable<ModuleOptions['registry']>
    expectTypeOf<Registry['googleAnalytics']>().not.toBeAny()
    expectTypeOf<Registry['clarity']>().not.toBeAny()
    expectTypeOf<Registry['stripe']>().not.toBeAny()
  })
})

// Issue #570: Verify #nuxt-scripts/types exports are available
// When adding new scripts to registry, the type definitions were broken
// because `export {}` was missing from the generated .d.ts file
describe('#nuxt-scripts/types exports', () => {
  it('exports UseScriptContext type', () => {
    expectTypeOf<UseScriptContext<{ foo: string }>>().not.toBeAny()
    expectTypeOf<UseScriptContext<{ foo: string }>>().toBeObject()
  })

  it('exports NuxtUseScriptOptions type', () => {
    expectTypeOf<NuxtUseScriptOptions>().not.toBeAny()
    expectTypeOf<NuxtUseScriptOptions>().toBeObject()
  })

  it('exports RegistryScriptInput type', () => {
    expectTypeOf<RegistryScriptInput>().not.toBeAny()
  })

  it('exports ScriptRegistry interface', () => {
    expectTypeOf<ScriptRegistry>().not.toBeAny()
    expectTypeOf<ScriptRegistry>().toBeObject()
  })

  it('ScriptRegistry has known keys', () => {
    expectTypeOf<ScriptRegistry>().toHaveProperty('googleAnalytics')
    expectTypeOf<ScriptRegistry>().toHaveProperty('googleTagManager')
    expectTypeOf<ScriptRegistry>().toHaveProperty('clarity')
  })
})
