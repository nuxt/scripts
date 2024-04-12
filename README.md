[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]
[![Volta][volta-src]][volta-href]

# Nuxt Scripts

Better Privacy, Performance, and DX for Third-Party Scripts in Nuxt Apps.

- [👾 &nbsp;Playground](https://stackblitz.com/github/nuxt/scripts/tree/main/playground)

## Features

- 🪨 [useScript by Unhead](https://unhead.unjs.io/usage/composables/use-script)
  - 🦥 Improve your site performance with better script loading strategies
  - 🎃 Powerful proxy API for SSR handling, lazy loading, and error handling
- 🎁 20+ third-party scripts composables and components
- ⏬ Serve scripts from your own server
- 🕵️ Privacy Features - Protect end users identity, provide consent to scripts.
- 🪵 DevTools integration - View your script with their status and see function logs

## Background

Loading third-party IIFE scripts using `useHead` composable is easy. However,
things start getting more complicated quickly around SSR, lazy loading, and type safety.

Nuxt Scripts was created to solve these issues and more with the goal of making third-party scripts more performant,
have better privacy and be better DX overall.

## Quick Start

To get started, simply run:

```bash
npx nuxi@latest module add @nuxt/scripts
```

To start using Nuxt Scripts, you can use the [useScript](https://unhead.unjs.io/usage/composables/use-script) composable to load your third-party scripts.

### Confetti Preview

If you want to get a preview for how the module works, you can use the registry script for [JS Confetti](https://github.com/loonywizard/js-confetti).

```ts
// place anywhere, just works in SSR
const { addConfetti } = useScriptConfetti({ version: 'latest' }, {
  trigger: 'onNuxtReady' // loads when the browser is idle
})
// will be executated on the client when the script is loaded
addConfetti({ emojis: ['🌈', '⚡️', '💥', '✨', '💫', '🌸'] })
```

## Registry


The registry is a collection of third-party scripts with out-of-the-box composable and component integrations for Nuxt Scripts.

Some registry scripts are stubs for external modules. When using these it will prompt to install the module for you.

- [Cloudflare Turnstile](#cloudflare-turnstile) - Nuxt Turnstile
- [Cloudflare Web Analytics](#cloudflare-web-analytics)
- [Confetti](#confetti)
- [Facebook Pixel](#facebook-pixel)
- [Fathom Analytics](#fathom-analytics)
- [Google Analytics](#google-analytics) - Nuxt Third Party Capital
- [Google Maps](#google-maps) - Nuxt Third Party Capital
  - [GoogleMapsEmbed](#google-maps-embed)
- [Google Tag Manager](#google-tag-manager) - Nuxt Third Party Capital
- [Hotjar](#hotjar)
- [Intercom](#intercom)
- [Matomo Analytics](#matomo-analytics)
- [Segment](#segment)
- [Stripe](#stripe)
  - [StripePricingTableEmbed](#stripe-pricing-table-mbed)
- [Vimeo](#vimeo-embed)
  - [VimeoEmbed](#vimeo-embed)
- [X Pixel](#x-pixel)
- [YouTube](#youtube) - Nuxt Third Party Capital
  - [YouTubeEmbed](#youtube-embed)

## Guides

### Global Custom Scripts

If you prefer a config based approach, you can load scripts globally by defining them in your `nuxt.config.ts`.

```ts
export default defineNuxtConfig({
  scripts: {
    globals: [
      'https://example.com/script.js',
    ]
  }
})
```

You can optionally provide the script as an array which allows you to provide script options.

```ts
export default defineNuxtConfig({
  scripts: {
    globals: [
      // script.js
      [
        { src: 'https://example.com/script.js' },
        { trigger: 'onNuxtReady'}
      ]
    ]
  }
})
```

### Script Bundling

Bundling scripts allows you to serve third-party scripts from your own servers. This has several benefits:
- Improved security, privacy and performance for end-users.
- Bypass ad blockers and privacy extensions.

For supported scripts, it's enabled by default. When building your site it will
download any detected scripts and bundle them with your app.

You can opt out of bundling by using the `assetStrategy` option.

```ts
export default defineNuxtConfig({
  scripts: {
    defaultScriptOptions: {
      assetStrategy: null
    }
  }
})
```

If you opt-out of bundling, you can still bundle scripts individually.

```ts
useScript('https://example.com/script.js', {
  assetStrategy: 'bundle'
})
```

### Overriding Scripts

When working with modules that use Nuxt Script, you may want to modify the
behavior of the script. This is especially useful for
changing the asset strategy of a script as it needs to be defined statically.

To do so you can use the `overrides` module option.

```ts
export default defineNuxtConfig({
  scripts: {
    overrides: {
      // the key is either a specified key or the script src
      confetti: {
        assetStrategy: 'bundle'
      }
    }
  }
})
```

### Privacy and Cookie Consent

Nuxt Scripts provides a `createScriptConsentTrigger` composable that allows you to load scripts based on user's consent.

You can either use it by providing a resolvable consent (ref, promise) option or by using `accept()`.

```ts
export const agreedToCookiesScriptConsent = createScriptConsentTrigger()
// ...
useScript('https://www.google-analytics.com/analytics.js', {
  trigger: agreedToCookiesScriptConsent
})
// ...
agreedToCookiesScriptConsent.accept()
```

```ts
const agreedToCookies = ref(false)
useScript('https://www.google-analytics.com/analytics.js', {
  // will be loaded in when the ref is true
  trigger: createScriptConsentTrigger({
    consent: agreedToCookies
  })
})
```

### Sending Page Events

When using tracking scripts, it's common to send an event when the page changes. Due to Nuxt's head implementation being
async, the page title is not always available on route change immediately.

`useAnalyticsPageEvent` solves this by providing you with the page title and path when they change.

```ts
useAnalyticsPageEvent(({ title, path }) => {
  // triggered on route change
  gtag('event', 'page_view', {
    page_title: title,
    page_location: 'https://example.com',
    page_path: path
  })
})
```

## API

### `useScript`

Please see the [useScript](https://unhead.unjs.io/usage/composables/use-script) documentation.

### `createScriptConsentTrigger`

**(options: ScriptConsentTriggerOptions) => { accept: () => void } & Promise<void>**

Creates a consent trigger for a script.

#### Arguments

- `consent` (optional) - A ref, promise, or boolean that resolves to the user's consent. Defaults to `undefined`.
- `loadOnNuxtReady` (optional) - If consent is provided before the browser idle, wait for the browser to be idle before loading the script. Defaults to `false`.

#### Returns

- `accept` - A function that can be called to accept the consent and load the script.

```ts
const trigger = createScriptConsentTrigger()
// accept the consent and load the script
trigger.accept()
```

### `useAnalyticsPageEvent`

**(callback?: (page: { title: string, path: string }) => void) => Ref<{ title: string, path: string }>**

Access the current page title and path and trigger an event when they change.

#### Arguments

- `callback` (optional) - A function that will be called when the page title or path changes.

#### Returns

- A ref containing the current page title and path.

```ts
const pageCtx = useAnalyticsPageEvent()
// will always be the current page title
pageCtx.value.title
```

## License

Licensed under the [MIT license](https://github.com/nuxt/scripts/blob/main/LICENSE.md).

## 📑 License

Published under the [MIT License](./LICENSE)

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/@nuxt/scripts/latest.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-version-href]: https://npmjs.com/package/@nuxt/scripts/v/rc

[npm-downloads-src]: https://img.shields.io/npm/dm/@nuxt/scripts.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-downloads-href]: https://npmjs.com/package/@nuxt/scripts/v/rc

[license-src]: https://img.shields.io/npm/l/@nuxt/scripts.svg?style=flat&colorA=18181B&colorB=28CF8D
[license-href]: https://npmjs.com/package/@nuxt/scripts/v/rc

[nuxt-src]: https://img.shields.io/badge/Nuxt-18181B?logo=nuxt.js
[nuxt-href]: https://nuxt.com

[volta-src]: https://user-images.githubusercontent.com/904724/209143798-32345f6c-3cf8-4e06-9659-f4ace4a6acde.svg
[volta-href]: https://volta.net/nuxt/scripts?utm_source=nuxt_scripts_readme
