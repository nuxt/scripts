import type { ModuleOptions } from '../../src/module'
import type { CrispApi } from '../../src/runtime/registry/crisp'
import type { DefaultEventName } from '../../src/runtime/registry/google-analytics'
import type {
  NuxtUseScriptOptions,
  RegistryScriptInput,
  ScriptRegistry,
  UseScriptContext,
} from '../../src/runtime/types'
import { describe, expectTypeOf, it } from 'vitest'

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

describe('registry api types', () => {
  it('CrispApi preserves literal unions for autocomplete', () => {
    type IsName = Parameters<CrispApi['is']>[0]
    // Should be assignable to string
    expectTypeOf<IsName>().toMatchTypeOf<string>()
    // Should NOT be exactly string (because it's a union with literals)
    expectTypeOf<IsName>().not.toEqualTypeOf<string>()
    // Should contain specific literals
    expectTypeOf<'chat:opened'>().toMatchTypeOf<IsName>()
  })

  it('CrispApi has specific overloads for methods', () => {
    // config overloads
    expectTypeOf<CrispApi['config']>().toMatchTypeOf<(name: 'container:index', value: number) => void>()
    expectTypeOf<CrispApi['config']>().toMatchTypeOf<(name: 'color:theme', value: 'red') => void>()
    expectTypeOf<CrispApi['config']>().toMatchTypeOf<(name: 'position:reverse', value: boolean) => void>()

    // set overloads
    expectTypeOf<CrispApi['set']>().toMatchTypeOf<(name: 'user:email', value: string) => void>()
    expectTypeOf<CrispApi['set']>().toMatchTypeOf<(name: 'session:data', value: [[string, string]]) => void>()

    // get overloads
    expectTypeOf<CrispApi['get']>().toMatchTypeOf<(name: 'chat:unread:count') => number>()
    expectTypeOf<CrispApi['get']>().toMatchTypeOf<(name: 'user:email') => string>()
  })

  it('GoogleAnalyticsApi preserves literal unions for autocomplete', () => {
    expectTypeOf<DefaultEventName>().toMatchTypeOf<string>()
    expectTypeOf<DefaultEventName>().not.toEqualTypeOf<string>()
    expectTypeOf<'page_view'>().toMatchTypeOf<DefaultEventName>()
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

  it('UseScriptContext has reload method', () => {
    type Ctx = UseScriptContext<{ foo: string }>
    expectTypeOf<Ctx['reload']>().toBeFunction()
    expectTypeOf<Ctx['reload']>().returns.toEqualTypeOf<Promise<{ foo: string }>>()
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
