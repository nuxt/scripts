<h1 align='center'>@nuxt/scripts</h1>

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

<p align="center">
Powerful DX improvements for loading third-party scripts in Nuxt.
</p>

## Features

All the features from Unhead [useScript](https://unhead.unjs.io/usage/composables/use-script):

- 🦥 Lazy, but fast: `defer`, `fetchpriority: 'low'`, early connections (`preconnect`, `dns-prefetch`)
- ☕ Loading strategies: `idle`, `manual`, `Promise`
- 🪨 Single script instance for your app
- 🎃 Events for SSR scripts: `onload`, `onerror`, etc
- 🪝 Proxy API: call the script functions before it's loaded, noop for SSR, stubbable, etc
- 🇹 Fully typed APIs

Plus Nuxt goodies:

- 🕵️ `createConsentTrigger` - Create a script trigger that you can resolve with a ref or a promise.
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

### `useScript`

Please see the [useScript](https://unhead.unjs.io/usage/composables/use-script) documentation.

### `createConsentTrigger`

This composable is a wrapper around `useScript` that respects privacy and cookie consent.

For the script to load you must provide a `consent` option. This can be promise, ref, or boolean.

```ts
const agreedToCookies = ref(false)
useScript('https://www.google-analytics.com/analytics.js', {
  // will be loaded in when the ref is true
  trigger: createConsentTrigger({
    consent: agreedToCookies
  })
})
```

You can respect the end-users browser Do Not Track option by providing the opt-in `honourDoNotTrack: true` config.

This is not enabled by default as most Analytics ignore this by default.

```ts
const agreedToCookies = ref(false)
useScript('https://www.google-analytics.com/analytics.js', {
  trigger: createConsentTrigger({
    honourDoNotTrack: true,
    consent: agreedToCookies
  })
})
```

### `useTrackedPage`

It's common when using tracking scripts to send an event when the page changes. Due to Nuxt's head implementation being
async, it's not possible to send the page title on route change.

`useTrackedPage` solves this by providing you with the page title and path when they change.

You can either provide a function to call on page change or use the ref that's returned.

```ts
useTrackedPage(({ title, path }) => {
  gtag('event', 'page_view', {
    page_title: title,
    page_location: 'https://example.com',
    page_path: path
  })
})
```

```ts
const trackedPage = useTrackedPage()
watch(trackedPage, ({ title, path }) => {
  gtag('event', 'page_view', {
    page_title: title,
    page_location: 'https://example.com',
    page_path: path
  })
})
```

## License

Licensed under the [MIT license](https://github.com/nuxt/scripts/blob/main/LICENSE.md).

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/@nuxt/scripts/latest.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-version-href]: https://npmjs.com/package/@nuxt/scripts

[npm-downloads-src]: https://img.shields.io/npm/dm/@nuxt/scripts.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-downloads-href]: https://npmjs.com/package/@nuxt/scripts

[license-src]: https://img.shields.io/github/license/nuxt/scripts.svg?style=flat&colorA=18181B&colorB=28CF8D
[license-href]: https://github.com/nuxt/scripts/blob/main/LICENSE

[nuxt-src]: https://img.shields.io/badge/Nuxt-18181B?logo=nuxt.js
[nuxt-href]: https://nuxt.com
