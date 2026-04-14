import type { ModuleOptions } from '../../packages/script/src/module'
import type { CrispApi } from '../../packages/script/src/runtime/registry/crisp'
import type { DefaultEventName } from '../../packages/script/src/runtime/registry/google-analytics'
import type { NuxtConfigScriptRegistry, NuxtConfigScriptRegistryEntry, NuxtUseScriptOptions, RegistryScriptInput, ScriptRegistry, UseScriptContext } from '../../packages/script/src/runtime/types'
import { describe, expectTypeOf, it } from 'vitest'

describe('module options registry', () => {
  type Registry = NonNullable<ModuleOptions['registry']>

  it('all registry entries are typed, not any', () => {
    // Every built-in registry key must resolve to its specific type, not `any`.
    // NuxtConfigScriptRegistry is an interface (not an intersection), so explicit
    // properties inherited via `extends` always take priority over the index signature.
    expectTypeOf<Registry['bingUet']>().not.toBeAny()
    expectTypeOf<Registry['blueskyEmbed']>().not.toBeAny()
    expectTypeOf<Registry['carbonAds']>().not.toBeAny()
    expectTypeOf<Registry['crisp']>().not.toBeAny()
    expectTypeOf<Registry['clarity']>().not.toBeAny()
    expectTypeOf<Registry['cloudflareWebAnalytics']>().not.toBeAny()
    expectTypeOf<Registry['databuddyAnalytics']>().not.toBeAny()
    expectTypeOf<Registry['metaPixel']>().not.toBeAny()
    expectTypeOf<Registry['fathomAnalytics']>().not.toBeAny()
    expectTypeOf<Registry['instagramEmbed']>().not.toBeAny()
    expectTypeOf<Registry['plausibleAnalytics']>().not.toBeAny()
    expectTypeOf<Registry['googleAdsense']>().not.toBeAny()
    expectTypeOf<Registry['googleAnalytics']>().not.toBeAny()
    expectTypeOf<Registry['googleMaps']>().not.toBeAny()
    expectTypeOf<Registry['googleRecaptcha']>().not.toBeAny()
    expectTypeOf<Registry['googleSignIn']>().not.toBeAny()
    expectTypeOf<Registry['lemonSqueezy']>().not.toBeAny()
    expectTypeOf<Registry['googleTagManager']>().not.toBeAny()
    expectTypeOf<Registry['hotjar']>().not.toBeAny()
    expectTypeOf<Registry['intercom']>().not.toBeAny()
    expectTypeOf<Registry['paypal']>().not.toBeAny()
    expectTypeOf<Registry['posthog']>().not.toBeAny()
    expectTypeOf<Registry['matomoAnalytics']>().not.toBeAny()
    expectTypeOf<Registry['mixpanelAnalytics']>().not.toBeAny()
    expectTypeOf<Registry['rybbitAnalytics']>().not.toBeAny()
    expectTypeOf<Registry['redditPixel']>().not.toBeAny()
    expectTypeOf<Registry['segment']>().not.toBeAny()
    expectTypeOf<Registry['stripe']>().not.toBeAny()
    expectTypeOf<Registry['tiktokPixel']>().not.toBeAny()
    expectTypeOf<Registry['xEmbed']>().not.toBeAny()
    expectTypeOf<Registry['xPixel']>().not.toBeAny()
    expectTypeOf<Registry['snapchatPixel']>().not.toBeAny()
    expectTypeOf<Registry['youtubePlayer']>().not.toBeAny()
    expectTypeOf<Registry['vercelAnalytics']>().not.toBeAny()
    expectTypeOf<Registry['vimeoPlayer']>().not.toBeAny()
    expectTypeOf<Registry['umamiAnalytics']>().not.toBeAny()
    expectTypeOf<Registry['gravatar']>().not.toBeAny()
    expectTypeOf<Registry['npm']>().not.toBeAny()
  })

  it('known keys resolve to their exact entry type, not the catch-all', () => {
    // Known registry keys must resolve to NuxtConfigScriptRegistryEntry<SpecificInput>,
    // not the index signature's `any` catch-all.
    // The interface approach guarantees this: inherited properties from `extends` always
    // take priority over the index signature.
    type GoogleMapsEntry = NuxtConfigScriptRegistry['googleMaps']
    type CatchAllEntry = NuxtConfigScriptRegistry[string]
    // Known key must NOT equal the catch-all
    expectTypeOf<GoogleMapsEntry>().not.toEqualTypeOf<CatchAllEntry>()

    // Verify specific input properties survive (not collapsed to unknown)
    type ObjectForm<K extends keyof Registry> = Exclude<Registry[K], boolean | 'mock' | undefined>
    expectTypeOf<ObjectForm<'googleMaps'>['apiKey']>().not.toBeNever()
    expectTypeOf<ObjectForm<'googleAnalytics'>['id']>().not.toBeNever()
    expectTypeOf<ObjectForm<'clarity'>['id']>().not.toBeNever()
  })

  it('registry allows unknown keys as catch-all', () => {
    // Unknown keys fall through to the index signature (any), so custom scripts work
    expectTypeOf<Registry['my-custom-script']>().toBeAny()
  })

  // Issue #700: NuxtConfigScriptRegistryEntry<any> must not collapse to Record<string, never>
  // This happens when Nuxt's $production/$development wraps the config in DeepPartial,
  // collapsing the interface's index signature priority and resolving all keys to `any`.
  it('NuxtConfigScriptRegistryEntry<any> allows arbitrary properties', () => {
    type Entry = Exclude<NuxtConfigScriptRegistryEntry<any>, boolean | 'mock'>
    // Must not be never (would mean Record<string, never> killed the intersection)
    expectTypeOf<Entry>().not.toBeNever()
    // Arbitrary properties must be assignable, not `never`
    expectTypeOf<{ matomoUrl: string, siteId: number }>().toMatchTypeOf<Entry>()
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
