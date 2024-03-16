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

- 🕵️ `useTrackingScript` - Load a tracking script while respecting privacy and consent
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

### `useTrackingScript`

This composables is a wrapper around `useScript` that respects privacy and cookie consent.

For the script to load you must provide a `consent` option. This can be promise, ref, or boolean.

```ts
const agreedToCookies = ref(false)
useTrackingScript('https://www.google-analytics.com/analytics.js', {
  // will be loaded in when the ref is true
  consent: agreedToCookies
})
```

If the user has enabled `DoNotTrack` within their browser, the script will not be loaded, unless
explicitly ignoring.

```ts
const agreedToCookies = ref(false)
useTrackingScript('https://www.google-analytics.com/analytics.js', {
  ignoreDoNotTrack: true
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
