import type { GoogleTagManagerApi } from '../../packages/script/src/runtime/registry/google-tag-manager'
import { describe, expectTypeOf, it } from 'vitest'

/**
 * Regression guard for #852.
 *
 * `@gtm-support/core` (the engine behind `@gtm-support/vue-gtm`) declares
 * `Window.dataLayer?: DataLayerObject[]`. Interface declarations merge, so if this package
 * also declares `dataLayer` on the global `Window`, the merged `Window` fails this package's
 * own `extends` clause. TypeScript then reports TS2430 at every one of the consumer's own
 * `Window` augmentations, which the consumer cannot suppress.
 *
 * `dataLayer` must stay off the global `Window`. Its name is configurable through the
 * `l` / `dataLayer` options anyway, so `window.dataLayer` was never guaranteed to exist.
 * The proxy returned by `useScriptGoogleTagManager()` is the supported access path.
 */
describe('global `Window` augmentation', () => {
  it('does not declare `dataLayer`', () => {
    expectTypeOf<'dataLayer' extends keyof Window ? true : false>().toEqualTypeOf<false>()
  })

  it('keeps `google_tag_manager` declared', () => {
    // `useScriptGoogleTagManager`'s `use()` reads `window.google_tag_manager` directly.
    expectTypeOf<Window['google_tag_manager']>().toEqualTypeOf<GoogleTagManagerApi['google_tag_manager']>()
  })

  it('still types `dataLayer` on the GTM proxy API', () => {
    expectTypeOf<GoogleTagManagerApi['dataLayer']>().not.toBeAny()
    expectTypeOf<GoogleTagManagerApi['dataLayer']['push']>().toBeCallableWith({ event: 'test' })
  })
})
