# #522 - onBeforeGtmStart callback not triggered via config

## Issue
- **Repro**: https://stackblitz.com/edit/nuxt-starter-zwdg7pfn
- **Problem**: `onBeforeGtmStart` callback works when ID passed inline, but NOT when ID is in nuxt.config

## Reproduction

**Doesn't work** (ID in config):
```ts
// nuxt.config
scripts: {
  registry: {
    googleTagManager: { id: "GTM-XXXXXX" }
  }
}

// component
useScriptGoogleTagManager({
  onBeforeGtmStart: (gtag) => { /* NOT CALLED */ }
})
```

**Works** (ID inline):
```ts
useScriptGoogleTagManager({
  id: 'GTM-XXXXXXXX',
  onBeforeGtmStart: (gtag) => { /* CALLED */ }
})
```

## Files to Investigate

- `src/runtime/registry/google-tag-manager.ts`
- How registry scripts merge config vs inline options

## Plan

1. [ ] Read GTM registry script implementation
2. [ ] Trace how options merge between config and inline
3. [ ] Find where onBeforeGtmStart is called and why config-only path skips it
4. [ ] Fix option merging to preserve callbacks
5. [ ] Test with reproduction
