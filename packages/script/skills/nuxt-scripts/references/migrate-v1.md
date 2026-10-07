# Migrate @nuxt/scripts v1 to v2

Tested against `@nuxt/scripts` 2.0.0-beta.14 and `@nuxt/scripts-cli` 2.0.0-beta.14.

## Migration CLI

Run it from the project root. Keep the version: the CLI's npm `latest` tag can be an older beta.

```bash
npx @nuxt/scripts-cli@2.0.0-beta.14 migrate v2 --dry-run
npx @nuxt/scripts-cli@2.0.0-beta.14 migrate v2
```

It rewrites static registry config and the renamed APIs it can match in `.vue` and `.ts` files, then lists manual follow-ups. Review its diff:

- It leaves `scripts.security` in place. v2 ignores that key silently.
- It leaves `remove()` calls in place.
- It misses a renamed API when the proxy has another name, such as `rybbit.rybbit.pageview()` after `const { proxy: rybbit } = ...`.
- It keeps Plausible `domain` and asks for a `scriptId`. Until then, the build fails.

## v1 calls and their v2 replacements

| v1 | v2 |
|---|---|
| `googleAnalytics: true` | `googleAnalytics: { trigger: 'onNuxtReady' }` |
| `x: [{ id }, { trigger }]` or `x: { id, scriptOptions: { bundle: false } }` | `x: { id, trigger, bundle: false }` |
| `reverseProxyIntercept: false`, `'proxy-only'` | `proxy: false`, `{}` |
| `xEmbed: true` | `xEmbed: {}` |
| `globals: [...]` array | `globals: { name: ... }` object |
| `plausibleAnalytics: { domain }` | `plausibleAnalytics: { scriptId }` |
| `remove()` as component cleanup | `dispose()`, or nothing in Vue components |
| `use: () => readyPromise.then(...)` | `resolve: ({ waitFor }) => waitFor(...)` |
| `scripts.security`, `NUXT_SCRIPTS_PROXY_SECRET`, `generate-secret` | removed |
| `googleStaticMapsProxy`, Google Maps server proxies | removed; Static Maps loads from Google with the browser key |
| `<ScriptGoogleMaps :center :zoom>`, ref `googleMaps`, `overlay` | `:map-options="{ center, zoom }"`, `mapsApi`, `overlayView` |
| `<ScriptGoogleMapsAdvancedMarkerElement>`, `PinElement`, `HeatmapLayer` | `<ScriptGoogleMapsMarker>` with the `#content` slot; no heatmap |
| `proxy.ttq('track', ...)`, `proxy.rybbit.pageview()` | `proxy.ttq.track(...)`, `proxy.pageview()` |
| Matomo `trackPageView` | `watch` (default `true`) |

v2 also needs Nuxt `^4.6.0 || ^5.0.0` and `unhead` and `@unhead/vue` `^3.4.2`. If either Unhead package is missing or out of range, module setup stops with an error that names it and suggests `npx nuxi@latest upgrade --force`.
