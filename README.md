[![nuxt-scripts-social-card](https://github.com/nuxt/scripts/blob/main/.github/banner.png)](https://scripts.nuxt.com)

[![npm version][npm-version-src]][npm-href]
[![npm downloads][npm-downloads-src]][npm-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]
[![Volta][volta-src]][volta-href]

# Nuxt Scripts

Better Privacy, Performance, and DX for Third-Party Scripts in Nuxt Apps.

- [👾 &nbsp;Playground](https://stackblitz.com/edit/nuxt-starter-pkwfkx?file=pages%2Findex.vue)

> [!IMPORTANT]
> Nuxt Scripts is in beta, use with caution as some APIs may change.

## Features

- 🪨 Built on top of [Unhead Script Loading](https://unhead.unjs.io/docs/typescript/head/guides/core-concepts/loading-scripts)
- 🎁 20+ third-party scripts integrations with fine-grained performance optimizations
- 🏎️ Performance: Self hosting, advanced script loading triggers, best-practice defaults.
- 🕵️ Privacy: Defaults to protect end users identity, script consent management APIs.
- 🪵 DevTools: View your script with their status and see function logs
- 🚀 0 dependencies, ~2kb minimal runtime

## Background

Loading third-party IIFE scripts using `useHead` composable is easy. However,
things start getting more complicated quickly around SSR, lazy loading, and type safety.

Nuxt Scripts was created to solve these issues and more with the goal of making third-party scripts more performant,
have better privacy and be better DX overall.

## 🚀 Quick Start

To get started, simply run:

```bash
npx nuxi@latest module add scripts
```

> [!TIP]
> Generate an Agent Skill for this package using [skilld](https://github.com/harlan-zw/skilld):
> ```bash
> npx skilld add @nuxt/scripts
> ```

That's it! The Nuxt Scripts module should be downloaded and added to your Nuxt Config `modules`.

## 📦 Examples

Explore live examples on StackBlitz:

- [Cookie Consent](https://stackblitz.com/github/nuxt/scripts/tree/main/examples/cookie-consent) - Google Consent Mode v2 with GTM
- [Granular Consent](https://stackblitz.com/github/nuxt/scripts/tree/main/examples/granular-consent) - Per-category consent management
- [Custom Script](https://stackblitz.com/github/nuxt/scripts/tree/main/examples/custom-script) - Integrating any third-party script
- [Performance](https://stackblitz.com/github/nuxt/scripts/tree/main/examples/performance) - Optimize loading with triggers

## ⛰️ Next Steps

Need some inspiration to start using Nuxt Scripts? Try out the following:

1. 🎉 Make it rain emojis with the [Confetti Tutorial](https://scripts.nuxt.com/docs/getting-started/confetti-tutorial).
2. 📚 Learn about how the [Script Loading](https://scripts.nuxt.com/docs/guides/script-triggers) works.
3. 🔍 Explore the [Script Registry](https://scripts.nuxt.com/scripts) for popular pre-configured third-party scripts.
3. 🚀 Load other scripts with [useScript](https://scripts.nuxt.com/docs/api/use-script) or [Global Scripts](https://scripts.nuxt.com/docs/guides/global).
4. 🔨 Fine-tune your performance and privacy with [Bundling](https://scripts.nuxt.com/docs/guides/bundling) and [Consent Management](https://scripts.nuxt.com/docs/guides/consent).

## ⚖️ License

Licensed under the [MIT license](https://github.com/nuxt/scripts/blob/main/LICENSE.md).

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/@nuxt/scripts/latest.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-downloads-src]: https://img.shields.io/npm/dm/@nuxt/scripts.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-href]: https://npmjs.com/package/@nuxt/scripts

[license-src]: https://img.shields.io/npm/l/@nuxt/scripts.svg?style=flat&colorA=18181B&colorB=28CF8D
[license-href]: https://github.com/nuxt/scripts/blob/main/LICENSE.md

[nuxt-src]: https://img.shields.io/badge/Nuxt-18181B?logo=nuxt
[nuxt-href]: https://nuxt.com

[volta-src]: https://user-images.githubusercontent.com/904724/209143798-32345f6c-3cf8-4e06-9659-f4ace4a6acde.svg
[volta-href]: https://volta.net/nuxt/scripts?utm_source=nuxt_scripts_readme
