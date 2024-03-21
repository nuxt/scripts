[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]
[![Volta][volta-src]][volta-href]

# Nuxt Scripts

Better Privacy, Performance, and DX for Third-Party Scripts in Nuxt Apps.

- [👾 &nbsp;Playground - TODO](https://stackblitz.com/github/nuxt/scripts/tree/main/playground)

## Features

All the features from Unhead [useScript](https://unhead.unjs.io/usage/composables/use-script):

- 🦥 Lazy, but fast: `defer`, `fetchpriority: 'low'`, early connections (`preconnect`, `dns-prefetch`)
- ☕ Loading strategies: `idle`, `manual`, `Promise`
- 🪨 Single script instance for your app
- 🎃 Events for SSR scripts: `onload`, `onerror`, etc
- 🪝 Proxy API: call the script functions before it's loaded, noop for SSR, stubbable, etc
- 🇹 Fully typed APIs

Plus Nuxt goodies:

- ⏬ Serve third-party scripts from your own server
- 🕵️ Privacy Features - Trigger scripts loading on cookie consent, honour DoNotTrack.
- 🪵 DevTools integration - see all your loaded scripts with function logs

## Installation

1. Install `@nuxt/scripts` dependency to your project:

```bash
pnpm add -D @nuxt/scripts
#
yarn add -D @nuxt/scripts
#
npm install -D @nuxt/scripts
```

2. Add it to your `modules` section in your `nuxt.config`:

```ts
export default defineNuxtConfig({
  modules: ['@nuxt/scripts']
})
```

## Background

Loading third-party IIFE scripts using `useHead` composable is easy. However,
things start getting more complicated quickly around SSR, lazy loading, and type safety.

Nuxt Scripts was created to solve these issues and more with the goal of making third-party scripts a breeze to use.

## Usage

### Getting Started

To start using Nuxt Scripts, you can use the `useScript` composable to load your third-party scripts.

```ts
useScript('https://cdn.jsdelivr.net/npm/js-confetti@latest/dist/js-confetti.browser.js')
```

See the Unhead [useScript](https://unhead.unjs.io/usage/composables/use-script) guide for next steps.

### Bundling Scripts

Bundling scripts can allow you to serve them from your own server, improving privacy and performance. It
can also help to get around ad blockers and other privacy tools when you need a script to load.

You can opt-in to have your scripts bundled by using the `assetStrategy` option. As this is
analyzed at build time, you must define it statically.

```ts
useScript('https://cdn.jsdelivr.net/npm/js-confetti@latest/dist/js-confetti.browser.js', {
  assetStrategy: 'bundle'
})
// js-confetti.browser.js will be downloaded and bundled with your app as a static asset
```

### Privacy and Cookie Consent

Nuxt Scripts provides a `createScriptConsentTrigger` composable that allows you to load scripts based on user's consent.

You can either use it by providing a resolvable consent (ref, promise) option or by using `accept()`.

```ts
export const agreedToCookiesScriptConsent = createScriptConsentTrigger({
  honourDoNotTrack: true,
})
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
    honourDoNotTrack: true, // optional, disabled by default
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
- `honourDoNotTrack` (optional) - Respect the end-users browser Do Not Track option. Defaults to `false`.
- `idle` (optional) - If consent is provided before the browser idle, wait for the browser to be idle before loading the script. Defaults to `false`.

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

### `isDoNotTrackEnabled`

**() => boolean**

Check if the user's browser has Do Not Track enabled. On the server it will read the `DNT` header, and on the client it will read the `navigator.doNotTrack` property.

#### Returns

- `true` if Do Not Track is enabled, `false` otherwise.

```ts
const dnt = isDoNotTrackEnabled()
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
