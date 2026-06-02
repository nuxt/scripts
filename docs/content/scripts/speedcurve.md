---
title: SpeedCurve LUX
description: Use SpeedCurve LUX Real User Monitoring in your Nuxt app to measure performance experienced by real users, with automatic SPA navigation tracking.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/speedcurve.ts
    size: xs
---

[SpeedCurve LUX](https://speedcurve.com/features/lux/) is a Real User Monitoring (RUM) tool that measures the performance your users experience. It tracks Core Web Vitals, custom timing marks, and JavaScript errors.

::script-stats
::

::script-docs
::

The composable comes with the following defaults:
<!-- eslint-disable-next-line harlanzw/ai-deslop-passive-voice -->
- **Trigger: Client** The LUX primer is injected into `<head>`{lang="html"} immediately; `lux.js` loads when Nuxt hydrates.

## Setup

SpeedCurve LUX is opt-in. You **must** register it in `scripts.registry.speedcurve` before calling `useScriptSpeedCurve`, including for per-page usage. Registration triggers the module to resolve and inline the LUX primer at build time. Install the `@speedcurve/lux` peer dep alongside:

```bash
pnpm add -D @speedcurve/lux
```

```ts [nuxt.config.ts: composable-only (no global load)]
export default defineNuxtConfig({
  modules: ['@nuxt/scripts'],
  scripts: {
    registry: {
      // Minimum registration — enables the composable per-page.
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
      speedcurve: { id: 'YOUR_SPEEDCURVE_ID', trigger: 'onNuxtReady' },
    },
  },
})
```

If `speedcurve` isn't registered, builds fail with an unresolved `#build/nuxt-scripts-speedcurve-snippet` import. If it's registered but `@speedcurve/lux` is missing, the build fails with an install hint. Pinning your own `@speedcurve/lux` version means you control when the primer snippet updates.

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

Set `spaMode: true` to enable SpeedCurve's SPA tracking mode. The composable wires Vue Router automatically:

- `router.beforeEach` calls `LUX.startSoftNavigation()`{lang="ts"} (closes the previous beacon, starts a new one)
- `nuxt.hook('page:finish')`{lang="ts"} calls `LUX.markLoadTime()`{lang="ts"} after the next paint (sets the END mark)
- Cancelled navigations seal the phantom beacon with `addData('luxNavFailed', '1')`{lang="ts"} for easy filtering

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

Reference: https://support.speedcurve.com/docs/add-rum-to-your-csp

::script-types
::

## Example

Loading SpeedCurve LUX through `app.vue` with SPA tracking enabled.

```vue [app.vue]
<script setup lang="ts">
useScriptSpeedCurve({
  id: 'YOUR_SPEEDCURVE_ID',
  spaMode: true,
})
</script>
```
