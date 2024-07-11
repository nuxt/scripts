# Changelog


## v0.6.3

[compare changes](https://github.com/nuxt/scripts/compare/v0.6.2...v0.6.3)

### 🩹 Fixes

- **tpc:** Annotate return type of tpc composables ([#141](https://github.com/nuxt/scripts/pull/141))
- **tpc:** Directly push tpc composables into registry ([#139](https://github.com/nuxt/scripts/pull/139))
- **tpc:** Use mlly to resolve third-party-capital ([#138](https://github.com/nuxt/scripts/pull/138))

### 🏡 Chore

- Bump deps ([ce084bf](https://github.com/nuxt/scripts/commit/ce084bf))

### ❤️ Contributors

- Harlan ([@harlan-zw](http://github.com/harlan-zw))
- Julien Huang ([@huang-julien](http://github.com/huang-julien))

## v0.6.2

[compare changes](https://github.com/nuxt/scripts/compare/v0.6.1...v0.6.2)

### 🩹 Fixes

- Broken `globals` array config parsing ([292bd8e](https://github.com/nuxt/scripts/commit/292bd8e))

### ❤️ Contributors

- Harlan ([@harlan-zw](http://github.com/harlan-zw))

## v0.6.1

[compare changes](https://github.com/nuxt/scripts/compare/v0.6.0...v0.6.1)

### 🏡 Chore

- Broken deps ([5c854e7](https://github.com/nuxt/scripts/commit/5c854e7))

### ❤️ Contributors

- Harlan ([@harlan-zw](http://github.com/harlan-zw))

## v0.6.0

[compare changes](https://github.com/nuxt/scripts/compare/v0.5.1...v0.6.0)

### 🚀 Enhancements

- Detect await $script.load() ([#117](https://github.com/nuxt/scripts/pull/117))
- ⚠️  Convert module config `globals` to object ([#127](https://github.com/nuxt/scripts/pull/127))
- `ScriptIntercom` ([fa5ab56](https://github.com/nuxt/scripts/commit/fa5ab56))
- `useScriptCrisp` and `ScriptCrisp` ([#128](https://github.com/nuxt/scripts/pull/128))
- ⚠️  `ScriptLemonSqueezy` ([#130](https://github.com/nuxt/scripts/pull/130))

### 🩹 Fixes

- **tpc:** Respect script location and action field ([#105](https://github.com/nuxt/scripts/pull/105))
- **docs:** Matomo-analytics website url ([#118](https://github.com/nuxt/scripts/pull/118))
- Generate globals plugin correctly ([1594f67](https://github.com/nuxt/scripts/commit/1594f67))
- Use object syntax to define NuxtConfigScriptRegistry ([#124](https://github.com/nuxt/scripts/pull/124))
- Avoid adding plugin if module is disabled ([2e4df43](https://github.com/nuxt/scripts/commit/2e4df43))
- Devtool UI improvements ([a8bf500](https://github.com/nuxt/scripts/commit/a8bf500))
- Make scripts accessible at `nuxtApp.$scripts` ([a41347c](https://github.com/nuxt/scripts/commit/a41347c))
- Hook up UI props ([993c123](https://github.com/nuxt/scripts/commit/993c123))
- ⚠️  `ScriptCarbonAds` prefer `ready` event ([d32e0d8](https://github.com/nuxt/scripts/commit/d32e0d8))
- Consistent component `error` event emits ([c9d2b3e](https://github.com/nuxt/scripts/commit/c9d2b3e))
- ⚠️  Rename `useElementScriptTrigger`, `useConsentScriptTrigger`, `useAnalyticsPageEvent` ([038d891](https://github.com/nuxt/scripts/commit/038d891))
- Properly support array triggers with `useScriptTriggerElement` ([ade64a4](https://github.com/nuxt/scripts/commit/ade64a4))

### 💅 Refactors

- **tpc:** Move tests to AST instead of code snapshots ([#99](https://github.com/nuxt/scripts/pull/99))
- Refactor `import { type foo }` to `import type { foo }` ([#108](https://github.com/nuxt/scripts/pull/108))
- **tpc:** Remove augmentWindowTypes ([#119](https://github.com/nuxt/scripts/pull/119))

### 📖 Documentation

- **readme:** Fix links in `Next Steps` ([#102](https://github.com/nuxt/scripts/pull/102))
- Add basic contribution guide ([#109](https://github.com/nuxt/scripts/pull/109))
- Refactor `script setup lang="ts"` ([#116](https://github.com/nuxt/scripts/pull/116))
- Fix contributing guide ([#122](https://github.com/nuxt/scripts/pull/122))

### 🏡 Chore

- **monorepo:** Put deps in root ([#93](https://github.com/nuxt/scripts/pull/93))
- **ci:** Add GitHub PR template ([#101](https://github.com/nuxt/scripts/pull/101))
- **monorepo:** Update deps in `client/` ([#100](https://github.com/nuxt/scripts/pull/100))
- **template:** Fix PR template ([#107](https://github.com/nuxt/scripts/pull/107))
- Add `eslint-plugin-n` to ESLint rules ([#106](https://github.com/nuxt/scripts/pull/106))
- Prepare in postinstall ([735fdbd](https://github.com/nuxt/scripts/commit/735fdbd))
- Update nuxt-module-builder to 0.8.0 ([#110](https://github.com/nuxt/scripts/pull/110))
- **ci:** Move renovate config ([#112](https://github.com/nuxt/scripts/pull/112))
- Fix module option registry type generation ([#114](https://github.com/nuxt/scripts/pull/114))
- Drop `postinstall` ([#120](https://github.com/nuxt/scripts/pull/120))
- Bump deps ([c9f881e](https://github.com/nuxt/scripts/commit/c9f881e))
- Bump lock ([d05952a](https://github.com/nuxt/scripts/commit/d05952a))
- Bump lock ([db571cf](https://github.com/nuxt/scripts/commit/db571cf))
- Bump deps ([36d79d3](https://github.com/nuxt/scripts/commit/36d79d3))
- Fix broken devtools ([de35240](https://github.com/nuxt/scripts/commit/de35240))
- Lint ([e9e6483](https://github.com/nuxt/scripts/commit/e9e6483))
- Bump deps ([436981f](https://github.com/nuxt/scripts/commit/436981f))
- Fix tests ([dc79087](https://github.com/nuxt/scripts/commit/dc79087))
- Fix broken types ([722577b](https://github.com/nuxt/scripts/commit/722577b))
- Broken ts checks ([ea8e96b](https://github.com/nuxt/scripts/commit/ea8e96b))
- Clean up crisp & intercom ([83e6c2b](https://github.com/nuxt/scripts/commit/83e6c2b))
- Optional google adsense `loaded` ([21c7e89](https://github.com/nuxt/scripts/commit/21c7e89))
- Misc fixes ([829f4a8](https://github.com/nuxt/scripts/commit/829f4a8))
- Lint ([30e1768](https://github.com/nuxt/scripts/commit/30e1768))
- Broken types ([669d653](https://github.com/nuxt/scripts/commit/669d653))

#### ⚠️ Breaking Changes

- ⚠️  Convert module config `globals` to object ([#127](https://github.com/nuxt/scripts/pull/127))
- ⚠️  `ScriptLemonSqueezy` ([#130](https://github.com/nuxt/scripts/pull/130))
- ⚠️  `ScriptCarbonAds` prefer `ready` event ([d32e0d8](https://github.com/nuxt/scripts/commit/d32e0d8))
- ⚠️  Rename `useElementScriptTrigger`, `useConsentScriptTrigger`, `useAnalyticsPageEvent` ([038d891](https://github.com/nuxt/scripts/commit/038d891))

### ❤️ Contributors

- Harlan ([@harlan-zw](http://github.com/harlan-zw))
- Harlan Wilton ([@harlan-zw](http://github.com/harlan-zw))
- Julien Huang ([@huang-julien](http://github.com/huang-julien))
- Gangan ([@shinGangan](http://github.com/shinGangan))
- RoiLeo <medina.leo42@gmail.com>

## v0.5.1

[compare changes](https://github.com/nuxt/scripts/compare/v0.5.0...v0.5.1)

### 🩹 Fixes

- Missing registry types ([564898e](https://github.com/nuxt/scripts/commit/564898e))

### ❤️ Contributors

- Harlan ([@harlan-zw](http://github.com/harlan-zw))

## v0.5.0

[compare changes](https://github.com/nuxt/scripts/compare/v0.4.10...v0.5.0)

### 🩹 Fixes

- Mock validation `pipe` ([7c2fabb](https://github.com/nuxt/scripts/commit/7c2fabb))

### ❤️ Contributors

- Harlan ([@harlan-zw](http://github.com/harlan-zw))

## v0.4.10

[compare changes](https://github.com/nuxt/scripts/compare/v0.4.9...v0.4.10)

## v0.4.9

[compare changes](https://github.com/nuxt/scripts/compare/v0.4.8...v0.4.9)

## v0.4.8

[compare changes](https://github.com/nuxt/scripts/compare/v0.4.7...v0.4.8)

### 🚀 Enhancements

- **tpc:** Build-time third-party-capital composables ([#81](https://github.com/nuxt/scripts/pull/81))
- Clarity ([#91](https://github.com/nuxt/scripts/pull/91))

### 🩹 Fixes

- **vimeo:** Support `url` prop ([#82](https://github.com/nuxt/scripts/pull/82))
- Correct scriptBundling return type ([#85](https://github.com/nuxt/scripts/pull/85))

### 📖 Documentation

- Update contributors placeholder to chrome aurora ([#84](https://github.com/nuxt/scripts/pull/84))
- Tweak wording of perf results ([#89](https://github.com/nuxt/scripts/pull/89))
- Add more detail to billing docs ([#88](https://github.com/nuxt/scripts/pull/88))

### 🏡 Chore

- Broken docs ([2f0d962](https://github.com/nuxt/scripts/commit/2f0d962))
- Bump deps ([c5dff89](https://github.com/nuxt/scripts/commit/c5dff89))
- Lint ([0e02caf](https://github.com/nuxt/scripts/commit/0e02caf))
- Migrate to Nuxt ESLint ([#86](https://github.com/nuxt/scripts/pull/86))
- Bump deps ([7b46151](https://github.com/nuxt/scripts/commit/7b46151))
- Broken ts ([6e8cbd2](https://github.com/nuxt/scripts/commit/6e8cbd2))
- Lint ([1bb0a03](https://github.com/nuxt/scripts/commit/1bb0a03))
- Broken types ([a5934d9](https://github.com/nuxt/scripts/commit/a5934d9))
- Broken lint ([3d52245](https://github.com/nuxt/scripts/commit/3d52245))
- Add release:minor script ([01a153e](https://github.com/nuxt/scripts/commit/01a153e))

### ❤️ Contributors

- Harlan ([@harlan-zw](http://github.com/harlan-zw))
- Harlan Wilton ([@harlan-zw](http://github.com/harlan-zw))
- Julien Huang ([@huang-julien](http://github.com/huang-julien))
- Gangan ([@shinGangan](http://github.com/shinGangan))
- Kara 
- Dilshod Mirzoev ([@mdilshod1994](http://github.com/mdilshod1994))

## v0.4.7

[compare changes](https://github.com/nuxt/scripts/compare/v0.4.6...v0.4.7)

### 🚀 Enhancements

- Carbon ads ([#80](https://github.com/nuxt/scripts/pull/80))

### ❤️ Contributors

- Harlan Wilton ([@harlan-zw](http://github.com/harlan-zw))

## v0.4.6

[compare changes](https://github.com/nuxt/scripts/compare/v0.4.5...v0.4.6)

### 🚀 Enhancements

- Google adsense ([#75](https://github.com/nuxt/scripts/pull/75))

### 🩹 Fixes

- Tree shake registry script src resolvers ([f1423d2](https://github.com/nuxt/scripts/commit/f1423d2))
- `useElementScriptTrigger` support undefined trigger ([c684f6a](https://github.com/nuxt/scripts/commit/c684f6a))

### 🏡 Chore

- Extend script load timeout ([d1332cb](https://github.com/nuxt/scripts/commit/d1332cb))
- Extend test timeout ([9257845](https://github.com/nuxt/scripts/commit/9257845))

### ❤️ Contributors

- Harlan ([@harlan-zw](http://github.com/harlan-zw))
- Harlan Wilton ([@harlan-zw](http://github.com/harlan-zw))

## v0.4.5

[compare changes](https://github.com/nuxt/scripts/compare/v0.4.4...v0.4.5)

### 🏡 Chore

- Bump docs ([b762e13](https://github.com/nuxt/scripts/commit/b762e13))

### ❤️ Contributors

- Harlan ([@harlan-zw](http://github.com/harlan-zw))

## v0.4.4

[compare changes](https://github.com/nuxt/scripts/compare/v0.4.3...v0.4.4)

### 🩹 Fixes

- Force useRegistry return type ([#73](https://github.com/nuxt/scripts/pull/73))

### 📖 Documentation

- Fix homepage css ([#68](https://github.com/nuxt/scripts/pull/68))
- Fix homepage `ButtonGroup` mobile rounded border ([#71](https://github.com/nuxt/scripts/pull/71))

### 🏡 Chore

- Bump deps ([a24bd3d](https://github.com/nuxt/scripts/commit/a24bd3d))
- Broken build ([b12a889](https://github.com/nuxt/scripts/commit/b12a889))
- Lint ([1345d32](https://github.com/nuxt/scripts/commit/1345d32))
- Bump deps ([90a03d6](https://github.com/nuxt/scripts/commit/90a03d6))
- Bump deps ([13e59e3](https://github.com/nuxt/scripts/commit/13e59e3))
- Upstream type fixes ([8442409](https://github.com/nuxt/scripts/commit/8442409))

### ❤️ Contributors

- Harlan ([@harlan-zw](http://github.com/harlan-zw))
- Julien Huang ([@huang-julien](http://github.com/huang-julien))
- Maxime Pauvert ([@maximepvrt](http://github.com/maximepvrt))

## v0.4.3

[compare changes](https://github.com/nuxt/scripts/compare/v0.4.2...v0.4.3)

### 🏡 Chore

- Broken releases ([ce80ed2](https://github.com/nuxt/scripts/commit/ce80ed2))
- Missing release dependency ([4a394bd](https://github.com/nuxt/scripts/commit/4a394bd))
- Sync release script to org ([cb7bcc1](https://github.com/nuxt/scripts/commit/cb7bcc1))

### ❤️ Contributors

- Harlan ([@harlan-zw](http://github.com/harlan-zw))

