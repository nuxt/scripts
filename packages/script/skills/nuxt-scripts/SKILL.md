---
name: nuxt-scripts
description: Load and control third-party scripts in Nuxt with @nuxt/scripts v2. Covers the `scripts.registry` config key, registry composables such as useScriptGoogleAnalytics, useScriptMetaPixel, and useScriptPlausibleAnalytics, useScript with use, resolve, dispose, and remove, scripts.globals, useScriptTriggerConsent for cookie banners, build-time bundling, and the /_scripts/p first-party proxy. Use when a task adds analytics, pixels, chat, video, or map scripts to a Nuxt app, upgrades @nuxt/scripts from v1, mentions NUXT_PUBLIC_SCRIPTS_* variables, or reports a script that never loads, a build that fails downloading a script, or "invalid entry" and "requires scriptId" errors.
---

# @nuxt/scripts

Tested against `@nuxt/scripts` 2.0.0-beta.14 (npm `beta`) with Nuxt 4.6.0.
v2 needs Nuxt `^4.6.0 || ^5.0.0`, `@unhead/vue` and `unhead` `^3.4.2`, and Node.js `^22.22.3 || ^24.15.0 || >=26.0.0`.
Composables and components are auto-imported. The examples import from `#imports` only to stay complete modules.

## Setup

Install with `npx nuxi module add scripts`. A registry entry is a flat object, `'mock'`, or `false`; any other shape throws. Its `trigger` decides whether it loads globally:

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
      // Cookieless, so it loads on every page. The script ID comes from
      // NUXT_PUBLIC_SCRIPTS_PLAUSIBLE_ANALYTICS_SCRIPT_ID.
      plausibleAnalytics: { trigger: 'onNuxtReady' },
      // No trigger: app.vue loads it after consent. The ID comes from
      // NUXT_PUBLIC_SCRIPTS_GOOGLE_ANALYTICS_ID.
      googleAnalytics: {},
    },
  },
})
```

Each registry key reads `NUXT_PUBLIC_SCRIPTS_<KEY>_<FIELD>` (camelCase key and field in SCREAMING_SNAKE_CASE) without a `runtimeConfig` declaration.
The key must be in `scripts.registry`; otherwise the module warns and ignores the variable. These values are public.

## Automatic behaviour

- SSR HTML contains no script tags. Scripts load on the client after hydration (`onNuxtReady`).
- SSR adds `<link rel="preload" fetchpriority="low">` for `onNuxtReady` and `client` triggers. Set `warmupStrategy: false` to stop it.
- Cross-origin tags get `crossorigin="anonymous"` and `referrerpolicy="no-referrer"`.
- Registry scripts that support bundling are downloaded at build and served from `/_scripts/assets/<hash>.js`. Set `bundle: false` on an entry to load from the vendor. For most scripts this also stops the proxy, because the proxy rewrites the bundle.
- Collection requests of supported scripts go through `/_scripts/p/<host>/...`. Each script has a privacy tier, and every tier anonymises the IP. Set `proxy: false` on an entry to send them direct.
- Calls are deduplicated by `key`, else `src`. A second call returns the first instance and ignores its options.
- Each call gets its own consumer scope. Unmounting the component releases that call's callbacks and triggers; the shared script stays.

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

If the SDK signals readiness through a callback, use `resolve({ waitFor })`. `load()` then resolves only when the callback fires, and the cleanup runs when the script lifecycle ends:

```vue
<script setup lang="ts">
import { onMounted, useScript } from '#imports'

interface Sdk { version: string }
type SdkWindow = Window & { onSdkReady?: (sdk: Sdk) => void }

const sdk = useScript<Sdk>('https://cdn.example.com/sdk.js', {
  trigger: 'manual',
  resolve: ({ waitFor }) => waitFor<Sdk>((done) => {
    (window as SdkWindow).onSdkReady = done
    return () => delete (window as SdkWindow).onSdkReady
  }),
})

onMounted(() => {
  sdk.load().then(api => console.log('sdk ready:', api.version))
})
</script>

<template>
  <p>{{ sdk.status }}</p>
</template>
```

Give each instance a unique `key` to load one script twice with different options.

## Integrations

- `partytown: true` needs `@nuxtjs/partytown`. It writes `<script type="text/partytown" src>` into SSR HTML at once. It ignores `trigger`, so consent does not gate it. It keeps only `src`, so other attributes are dropped.
- `<ScriptXEmbed>`, `<ScriptInstagramEmbed>`, and `<ScriptBlueskyEmbed>` need `scripts.registry.xEmbed: {}` (or the matching key). Without it, SSR fails with "requires `scripts.registry.instagramEmbed` to be enabled". Embed routes are unsigned public proxies.
- The DevTools panel needs `@nuxt/scripts-devtools` at the same version. If it fails to install, skip it; loading and proxies work without it.

## Traps

- `trigger: false` blocks every composable call that passes no trigger, although the module's own warning suggests it for composable-driven loading. Use `{ id }` with no trigger key, or pass `scriptOptions: { trigger }` at the call.
- A registry entry with a `trigger` loads before consent code runs. A later call with a consent trigger gets that loaded instance. Keep consent-gated entries trigger-free.
- `remove()` removes the shared script for every consumer. To release one component's use, call `dispose()`, or let unmount do it.
- In `scripts.globals`, put `trigger` in the tuple's second item: `[{ src }, { trigger: 'manual' }]`. Beside `src` it is ignored, and the script loads on `onNuxtReady`.
- Option validation runs only in dev, and not for bundled scripts. When it runs, it holds the script and logs to the browser console, not the terminal. Production loads invalid options.
- The "config provided without a `trigger`" warning fires only for fields with no environment variable. `googleAnalytics: { id }` gets no warning.

### Deploy

- Bundling fetches each vendor script during `nuxt build`. One failed download fails the build, such as a blocked host or an offline CI. Set `assets.fallbackOnSrcOnBundleFail: true` to load that script from its vendor instead.
- `plausibleAnalytics` without a `scriptId` fails the build with "plausibleAnalytics requires scriptId". A placeholder ID fails the download.
- Bundles are cached for 7 days in `node_modules/.cache/nuxt/scripts`. If a vendor script is stale, delete that folder.
- `nuxt generate`, `nitro.static`, and static presets disable the proxy with a build warning. Requests go direct and are not anonymised.

## Breaking changes from v1

Run `npx @nuxt/scripts-cli migrate v2 --dry-run`, then without `--dry-run`. It rewrites static registry config and lists manual follow-ups. It does not touch `security` options or `remove()` calls.

| v1 | v2 |
|---|---|
| `googleAnalytics: true` | `googleAnalytics: { trigger: 'onNuxtReady' }` |
| `x: [{ id }, { trigger }]` or `x: { id, scriptOptions: { bundle: false } }` | `x: { id, trigger, bundle: false }` |
| `reverseProxyIntercept: false`, `'proxy-only'` | `proxy: false`, `{}` |
| `globals: [...]` array | `globals: { name: ... }` object |
| `plausibleAnalytics: { domain }` | `plausibleAnalytics: { scriptId }` |
| `remove()` as component cleanup | `dispose()`, or nothing in Vue components |
| `use: () => readyPromise.then(...)` | `resolve: ({ waitFor }) => waitFor(...)` |
| `scripts.security`, `NUXT_SCRIPTS_PROXY_SECRET`, `generate-secret` | removed; v2 ignores `security` silently |
| `googleStaticMapsProxy`, Google Maps server proxies | removed; Static Maps loads from Google with the browser key |
| `<ScriptGoogleMaps :center :zoom>`, ref `googleMaps`, `overlay` | `:map-options="{ center, zoom }"`, `mapsApi`, `overlayView` |
| `<ScriptGoogleMapsAdvancedMarkerElement>`, `PinElement`, `HeatmapLayer` | `<ScriptGoogleMapsMarker>` with the `#content` slot; no heatmap |
| `proxy.ttq('track', ...)`, `proxy.rybbit.pageview()` | `proxy.ttq.track(...)`, `proxy.pageview()` |
| Matomo `trackPageView` | `watch` (default `true`) |

## Config

Reference: <https://scripts.nuxt.com/docs/api/nuxt-config>. Options that change behaviour:

- `defaultScriptOptions`: default `{ trigger: 'onNuxtReady' }`, inherited by every script.
- `privacy`: `true`, `false`, or per-flag (`ip`, `userAgent`, `language`, `screen`, `timezone`, `hardware`) for proxied traffic.

## Debug

- Read the returned `status` ref: `awaitingLoad`, `loading`, `loaded`, `error`, or `removed`. `awaitingLoad` means the trigger never fired.
- Set `scripts.debug: true` to log each script's `registered`, `loading`, and `loaded` steps in the browser console.
- A `/_scripts/p/` 403 with `Domain not allowed` means the host is not a configured script domain. `Local network targets are not allowed` means the server's DNS resolves the vendor to a local address, such as an ad-blocking resolver.
