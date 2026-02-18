# Google Maps Fixes

## Related Issues

| # | Title | Status |
|---|-------|--------|
| **380** | crossOriginEmbedderPolicy CORS | Fixed (static maps proxy) |
| **83** | Optimize billing (cache static) | Fixed (static maps proxy) |
| **539** | Color mode (light/dark) | Fixed (mapIds prop) |
| **540** | MarkerClusterer optional peer dep | Fixed (inline types) |

## Completed Work

### Static Maps Proxy (PR #516 features - integrated)
- Added `googleStaticMapsProxy` config option in module.ts
- Created server handler at `/_scripts/google-static-maps-proxy`
- Updated ScriptGoogleMaps.vue to use proxy when enabled
- Enables caching with configurable `cacheMaxAge` (default 1 hour)
- Fixes CORS issues by serving static map images from same origin
- Reduces Google Maps API billing through server-side caching

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  scripts: {
    googleStaticMapsProxy: {
      enabled: true,
      cacheMaxAge: 3600 // 1 hour
    }
  }
})
```

### Color Mode Support (#539)
- Added `mapIds` prop: `{ light?: string, dark?: string }`
- Added `colorMode` prop for manual control
- Auto-detects @nuxtjs/color-mode if installed
- Watches color mode changes and updates map via `setOptions()`

```vue
<ScriptGoogleMaps
  :map-ids="{ light: 'LIGHT_MAP_ID', dark: 'DARK_MAP_ID' }"
  :api-key="apiKey"
/>
```

### MarkerClusterer Optional Peer Dep (#540)
- Removed top-level type import from `@googlemaps/markerclusterer`
- Created inline types: `MarkerClustererInstance`, `MarkerClustererOptions`
- Cast constructor call to avoid type conflicts
- Build no longer fails when markerclusterer is not installed

### Bug Fixes from Audit
1. **PinElement cleanup**: Added `onUnmounted` hook to clear pin content
2. **importLibrary cache**: Added failure retry logic (clears cache on rejection)

## Audit Findings (addressed)

### Fixed
- PinElement missing cleanup (memory leak)
- importLibrary cache race condition (failed imports cached forever)

### Deferred (lower priority)
- queryToLatLngCache unbounded size (minor memory concern)
- async-promise-executor patterns (code style)
- Deep watch on markers (performance optimization)
- Marker hashing collision potential (edge case)

## Files Changed

- `src/module.ts` - googleStaticMapsProxy config
- `src/runtime/server/google-static-maps-proxy.ts` - NEW proxy handler
- `src/runtime/components/GoogleMaps/ScriptGoogleMaps.vue` - color mode, proxy
- `src/runtime/components/GoogleMaps/ScriptGoogleMapsMarkerClusterer.vue` - inline types
- `src/runtime/components/GoogleMaps/ScriptGoogleMapsPinElement.vue` - cleanup

## Status: DONE

All tests pass (130/130). Ready for review.
