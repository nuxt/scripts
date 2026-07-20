---
title: SpeedCurve LUX
description: Use SpeedCurve LUX Real User Monitoring in your Nuxt app to measure performance experienced by real users, with automatic SPA navigation tracking.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/speedcurve.ts
    size: xs
---

[SpeedCurve LUX](https://www.speedcurve.com/features/performance-monitoring/) collects field performance data, including Core Web Vitals, custom timing marks, and JavaScript errors.

::script-stats
::

::script-docs
::

By default, the composable injects the LUX primer into `<head>`{lang="html"} immediately and loads `lux.js` during Nuxt hydration.

## Setup

SpeedCurve LUX is opt-in. Register it in `scripts.registry.speedcurve` to resolve and inline the LUX primer at build time. Install the `@speedcurve/lux` peer dep alongside:

```bash
pnpm add -D @speedcurve/lux
```

```ts [nuxt.config.ts: composable-only (no global load)]
export default defineNuxtConfig({
  modules: ['@nuxt/scripts'],
  scripts: {
    registry: {
      // Minimum registration: enables the composable per page.
      // Pass `id` here and you can omit it from each useScriptSpeedCurve() call.
      speedcurve: {},
    },
  },
})
```

```ts [nuxt.config.ts: auto-load globally]
export default defineNuxtConfig({
  modules: ['@nuxt/scripts'],
  scripts: {
    registry: {
      speedcurve: { id: 'YOUR_SPEEDCURVE_ID', trigger: 'client' },
    },
  },
})
```

For SpeedCurve, the registry `trigger` above is the marker that generates a global composable call. `useScriptSpeedCurve()`{lang="ts"} hard-codes the effective trigger to `client`, so `onNuxtReady`, manual, consent, and custom promise triggers in registry or composable options do not change its load timing.

If `speedcurve` isn't registered, `useScriptSpeedCurve` builds with an empty primer fallback. If it's registered but `@speedcurve/lux` is missing, the build fails with an install hint. Pinning your own `@speedcurve/lux` version means you control when the primer snippet updates.

You can access the `LUX` object as a proxy directly, or await `$script` to get the loaded instance.

::code-group

```ts [Proxy]
const { proxy } = useScriptSpeedCurve({ id: 'YOUR_ID' })
proxy.LUX.label = 'my-page'
```

```ts [onLoaded]
const { onLoaded } = useScriptSpeedCurve({ id: 'YOUR_ID' })
onLoaded(({ LUX }) => {
  LUX.label = 'my-page'
})
```

::

## SPA navigation

Set `spaMode: true` to enable SpeedCurve's [SPA tracking mode](https://support.speedcurve.com/docs/single-page-applications). The composable wires Vue Router automatically:

- `router.beforeEach` calls `LUX.startSoftNavigation()`{lang="ts"}, closing the previous beacon and starting a new one
- `nuxt.hook('page:finish')`{lang="ts"} calls `LUX.markLoadTime()`{lang="ts"} after the next paint to set the END mark
- Canceled navigations tag the phantom beacon with `addData('luxNavFailed', '1')`{lang="ts"}

Install this in `app.vue`. Nuxt Scripts creates the automatic router hooks once per browser session, so the first auto-tracked call supplies their label and navigation options.

```ts [app.vue]
useScriptSpeedCurve({
  id: 'YOUR_ID',
  spaMode: true,
  autoTrackSpaNavigations: true, // default when spaMode is true
})
```

To disable auto-wiring and instrument manually:

```ts
useScriptSpeedCurve({
  id: 'YOUR_ID',
  spaMode: true,
  autoTrackSpaNavigations: false,
})
// Then call LUX.startSoftNavigation() and LUX.markLoadTime() yourself
```

## Custom page labels

By default the composable uses `String(to.name ?? to.path)`{lang="ts"} as the page label for each navigation. Pass a function to `label` to override it:

```ts
useScriptSpeedCurve({
  id: 'YOUR_ID',
  spaMode: true,
  label: to => to.meta.title as string ?? to.path,
})
```

Set `label: false` to disable labeling entirely. Pass a plain string to set a static label (only meaningful without `spaMode`, since the router hook overwrites it on every navigation).

## CSP

Add these directives to your Content Security Policy:

```text
script-src  cdn.speedcurve.com;
img-src     lux.speedcurve.com;
connect-src lux.speedcurve.com beacon.speedcurve.com;
```

See SpeedCurve's [LUX Content Security Policy guide](https://support.speedcurve.com/docs/add-rum-to-your-csp) for the vendor's current directives.

::script-types
::

## Example

Load SpeedCurve LUX through `app.vue` with SPA tracking enabled:

```vue [app.vue]
<script setup lang="ts">
useScriptSpeedCurve({
  id: 'YOUR_SPEEDCURVE_ID',
  spaMode: true,
})
</script>
```
