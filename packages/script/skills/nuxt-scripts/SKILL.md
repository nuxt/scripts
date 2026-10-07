---
name: nuxt-scripts
description: Load and control third-party scripts in Nuxt with @nuxt/scripts. Covers the `scripts.registry` config key, registry composables such as useScriptGoogleAnalytics and useScriptMetaPixel, useScript, scripts.globals, useScriptTriggerConsent for cookie banners, build-time bundling, the /_scripts/p first-party proxy, and NUXT_SCRIPTS_PROXY_SECRET. Use when a task adds analytics, pixels, chat, video, or map scripts to a Nuxt app, mentions @nuxt/scripts or NUXT_PUBLIC_SCRIPTS_* variables, or reports a script that never loads, a build that fails downloading a script, or 403 errors on /_scripts routes.
---

# @nuxt/scripts

Tested against `@nuxt/scripts` 1.3.12 (npm `latest`) with Nuxt 4.6.0. The module needs Nuxt 3.16 or newer.
Composables and components are auto-imported. The examples import from `#imports` only to stay complete modules.

## Setup

Install with `npx nuxi module add scripts`. A registry entry's `trigger` decides whether it loads globally:

| `scripts.registry` entry | Global script | Composable called with no options |
|---|---|---|
| `{ id, trigger: 'onNuxtReady' }` | loads on every page | returns the global instance |
| `{ id }` or `{}` | none | loads with the default `onNuxtReady` trigger |
| `{ id, trigger: false }` | none | never loads: it inherits `trigger: false` |
| `'mock'` | none | stays `awaitingLoad`; proxy calls do nothing |

```ts
import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  modules: ['@nuxt/scripts'],
  scripts: {
    registry: {
      // Cookieless, so it loads on every page.
      plausibleAnalytics: { domain: 'example.com', trigger: 'onNuxtReady' },
      // No trigger: app.vue loads it after consent. The ID comes from
      // NUXT_PUBLIC_SCRIPTS_GOOGLE_ANALYTICS_ID.
      googleAnalytics: {},
    },
  },
})
```

Each registry key reads `NUXT_PUBLIC_SCRIPTS_<KEY>_<FIELD>` (camelCase key in SCREAMING_SNAKE_CASE) without a `runtimeConfig` declaration.
The key must be in `scripts.registry`; otherwise the module warns and ignores the variable. These values are public.

## Automatic behaviour

- SSR HTML contains no script tags. Scripts load on the client after hydration (`onNuxtReady`).
- SSR adds `<link rel="preload" fetchpriority="low">` for `onNuxtReady` and `client` triggers. Set `warmupStrategy: false` to stop it.
- Cross-origin tags get `crossorigin="anonymous"` and `referrerpolicy="no-referrer"`.
- Registry scripts that support bundling are downloaded at build and served from `/_scripts/assets/<hash>.js`. Set `bundle: false` on an entry to load from the vendor. For most scripts this also stops the proxy, because the proxy rewrites the bundle.
- Collection requests of supported scripts go through `/_scripts/p/<host>/...`. Each script has a privacy tier, and every tier anonymises the IP. Set `proxy: false` on an entry to send them direct.
- `nuxt dev` appends `NUXT_SCRIPTS_PROXY_SECRET` to `.env` when a signed endpoint is registered: `googleMaps`, `gravatar`, `xEmbed`, `instagramEmbed`, `blueskyEmbed`. Set `security.autoGenerateSecret: false` to stop it.
- Calls are deduplicated by `key`, else `src`. A second call returns the first instance and ignores its options.

## Common tasks

Load consent-gated scripts. A module-level trigger in `utils/` is shared by every component:

```ts
// utils/consent.ts
import { useScriptTriggerConsent } from '#imports'

export const scriptsConsent = useScriptTriggerConsent()
```

```vue
<!-- app.vue -->
<script setup lang="ts">
import { scriptsConsent, useScriptGoogleAnalytics } from '#imports'

const { consent } = useScriptGoogleAnalytics({
  // Pushed before gtag('js') and gtag('config').
  defaultConsent: { ad_storage: 'denied', analytics_storage: 'denied' },
  scriptOptions: { trigger: scriptsConsent },
})

function acceptAll() {
  scriptsConsent.accept()
  // `consent` is undefined during SSR, so its type is optional.
  consent?.update({ ad_storage: 'granted', analytics_storage: 'granted' })
}
</script>

<template>
  <button @click="acceptAll">
    Accept cookies
  </button>
  <NuxtPage />
</template>
```

`scriptsConsent.revoke()` sets `consented` to `false` but does not unload a loaded script. Call the vendor API through `consent` instead.

Call a vendor API. Proxy calls queue until load and return `undefined`; use `onLoaded` for a return value:

```vue
<script setup lang="ts">
import { useScript } from '#imports'

interface Widget { open: () => boolean }

const { proxy, load, onLoaded } = useScript<Widget>('https://cdn.example.com/widget.js', {
  trigger: 'manual',
  // Without `use`, the proxy has no API to call.
  use: () => (window as unknown as { Widget?: Widget }).Widget,
})

onLoaded((widget) => {
  console.log('opened:', widget.open())
})
</script>

<template>
  <button @click="load(); proxy.open()">
    Open widget
  </button>
</template>
```

Give each instance a unique `key` to load one script twice with different options.

## Integrations

- `partytown: true` needs `@nuxtjs/partytown`. It writes `<script type="text/partytown" src>` into SSR HTML at once. It ignores `trigger`, so consent does not gate it. It keeps only `src`, so `data-*` attributes such as Plausible's domain are dropped.
- `<ScriptXEmbed>`, `<ScriptInstagramEmbed>`, and `<ScriptBlueskyEmbed>` need `scripts.registry.xEmbed: true` (or the matching key). Without it, SSR fails with "requires `scripts.registry.instagramEmbed` to be enabled".

## Traps

- `trigger: false` blocks every composable call that passes no trigger, although the module's own warning suggests it for composable-driven loading. Use `{ id }` with no trigger key, or pass `scriptOptions: { trigger }` at the call.
- A registry entry with a `trigger` loads before consent code runs. A later call with a consent trigger gets that loaded instance. Keep consent-gated entries trigger-free.
- In `scripts.globals`, put `trigger` in the tuple's second item: `[{ src }, { trigger: 'manual' }]`. Beside `src` it is ignored, and the script loads on `onNuxtReady`.
- Option validation runs only in dev, and not for bundled scripts. When it runs, it holds the script and logs to the browser console, not the terminal. Production loads invalid options.
- The "config provided without a `trigger`" warning fires only for fields with no environment variable. `googleAnalytics: { id }` gets no warning.

### Deploy

- Bundling fetches each vendor script during `nuxt build`. One failed download fails the build, such as a blocked host or an offline CI. Set `assets.fallbackOnSrcOnBundleFail: true` to load that script from its vendor instead.
- Bundles are cached for 7 days in `node_modules/.cache/nuxt/scripts`. If a vendor script is stale, delete that folder.
- `nuxt generate`, `nitro.static`, and static presets disable the proxy with a build warning. Requests go direct and are not anonymised.
- The signing secret is read at build time and written into `.output/server`. A secret set only at runtime does not enforce signing. A local `nuxt build` reads the dev-generated `.env` secret.
- The SSR payload carries a per-request page token. Set `security: false` if you need a stable payload or `etag`.

## Version limits

- v1 changed v0 behaviour: registry entries no longer load without `trigger`. Old: `googleAnalytics: { id }` loaded everywhere. New: `{ id, trigger: 'onNuxtReady' }`.
- `registry.x: true` is deprecated; use `{ trigger: 'onNuxtReady' }`. `'proxy-only'` throws; use `{}`. `reverseProxyIntercept` is now `proxy`.
- PayPal uses SDK v6: `<ScriptPayPalButtons>` exposes `sdkInstance` in its default slot and renders no buttons.
- Google Maps: `markers` and `centerMarker` props are gone; use child `<ScriptGoogleMapsMarker>`. Use `:map-options="{ center, zoom }"`.
- `<ScriptYouTubePlayer>` sizes with `ratio` (default `16/9`). The placeholder uses `object-fit: cover`.
- 2.0 betas change this surface. If `npm ls @nuxt/scripts` shows 2.x, check its docs first.

## Config

Reference: <https://scripts.nuxt.com/docs/api/nuxt-config>. Options that change behaviour:

- `defaultScriptOptions`: default `{ trigger: 'onNuxtReady' }`, inherited by every script.
- `privacy`: `true`, `false`, or per-flag (`ip`, `userAgent`, `language`, `screen`, `timezone`, `hardware`) for proxied traffic.

## Debug

- Read the returned `status` ref: `awaitingLoad`, `loading`, `loaded`, `error`, or `removed`. `awaitingLoad` means the trigger never fired.
- Set `scripts.debug: true` to log each script's `registered`, `loading`, and `loaded` steps in the browser console.
- A `/_scripts/p/` 403 with `Domain not allowed` means the host is not a configured script domain. `Local network targets are not allowed` means the server's DNS resolves the vendor to a local address, such as an ad-blocking resolver.
- Generate a signing secret with the package binary: `pnpm exec nuxt-scripts generate-secret`.
