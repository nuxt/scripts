## DONE

# Fix: Plausible Analytics new script not working (#543)

## Problem
Users report that the new Plausible script format (with `scriptId`) loads correctly in DOM but no events are sent.

## Analysis

### Root Cause
The `clientInit` stub uses bare `plausible` identifier inconsistently with `window.plausible`:

```js
// Current code (plausible-analytics.ts:187)
window.plausible = window.plausible || function () { (plausible.q = plausible.q || []).push(arguments) }, plausible.init = plausible.init || function (i) { plausible.o = i || {} }
```

Issues:
1. **Inconsistent window reference**: First part uses `window.plausible`, second part uses bare `plausible`
2. **Module scope**: In ES modules (strict mode), bare identifier resolution differs from non-module scripts
3. **Compare to GA**: Google Analytics uses `w` (window) consistently throughout its clientInit

### How Plausible's new script works
The `pa-{scriptId}.js` script:
1. Checks `plausible.o && S(plausible.o)` on load to pick up pre-init options
2. The stub's `plausible.init()` stores options in `plausible.o`
3. Script has domain hardcoded, doesn't need `data-domain` attribute

### Verification
Plausible script expected stub format:
```js
window.plausible = window.plausible || {}
plausible.o && S(plausible.o)  // If .o exists, initialize with those options
```

Our stub needs to set `plausible.o` before script loads, which it does via:
```js
plausible.init = function(i) { plausible.o = i || {} }
window.plausible.init(initOptions)
```

## Fix

Update `clientInit` to use `window.plausible` consistently (like GA does):

```ts
clientInit() {
  const w = window as any
  w.plausible = w.plausible || function () { (w.plausible.q = w.plausible.q || []).push(arguments) }
  w.plausible.init = w.plausible.init || function (i: PlausibleInitOptions) { w.plausible.o = i || {} }
  w.plausible.init(initOptions)
}
```

## Files to modify
- `src/runtime/registry/plausible-analytics.ts`: Fix clientInit stub pattern

## Test plan
1. Run existing tests
2. Test playground with plausible-analytics-v2.vue
3. Verify script loads and init options are picked up
