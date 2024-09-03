---
title: Google Adsense
description: Show Google Adsense ads in your Nuxt app.
links:
  - label: useScriptGoogleAdsense
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/src/runtime/registry/google-adsense.ts
    size: xs
  - label: "<ScriptGoogleAdsense>"
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/src/runtime/components/ScriptGoogleAdsense.vue
    size: xs
---

:UAlert{title="Experimental" description="The Google Adsense integration has not been fully tested, use with caution." color="yellow" variant="soft" class="not-prose"}

[Google Adsense](https://www.google.com/adsense/start/) allows you to monetize your website by displaying ads.

Nuxt Scripts provides a `useScriptGoogleAdsense` composable and a headless `ScriptGoogleAdsense` component to interact with the Google Adsense.

## ScriptGoogleAdsense

The `ScriptGoogleAdsense` component is a wrapper around the `useScriptGoogleAdsense` composable. It provides a simple way to embed ads in your Nuxt app.

```vue
<template>
  <ScriptGoogleAdsense
    data-ad-client="ca-pub-..."
    data-ad-slot="..."
  />
</template>
```

### Handling Ad-blockers

You can use these hooks to add a fallback when the Google Adsense script is blocked.

```vue
<template>
  <ScriptGoogleAdsense
    data-ad-client="ca-pub-..."
    data-ad-slot="..."
  >
    <template #error>
      <!-- Fallback ad -->
      Please support us by disabling your ad blocker.
    </template>
  </ScriptGoogleAdsense>
</template>
```


### Component API

See the [Facade Component API](/docs/guides/facade-components#facade-components-api) for full props, events, and slots.

### Props

The `ScriptGoogleAdsense` component supports all props that Google Adsense supports on the `<ins>` tag. See the [Ad tags documentation](https://developers.google.com/adsense/platforms/transparent/ad-tags) for more information.

At a minimum you must provide the following tags:
- `data-ad-client`: The Google Adsense ID.
- `data-ad-slot`: The slot ID.

## useScriptGoogleAdsense

The `useScriptGoogleAdsense` composable lets you have fine-grain control over the Google Adsense script.

```ts
export function useScriptGoogleAdsense<T extends GoogleAdsenseApi>(_options?: GoogleAdsenseInput) {}
```

Please follow the [Registry Scripts](/docs/guides/registry-scripts) guide to learn more about advanced usage.

### Site Ownership Verification

When a `client` is provided, a meta tag will be inserted on the page so that Google can verify your site ownership.

```ts
const adsense = useScriptGoogleAdsense({
  client: 'ca-pub-<your-id>',
})
```

The generated meta tag will look like this:

```html
<meta name="google-adsense-account" content="ca-pub-<your-id>">
```

### GoogleAdsenseApi

```ts
export interface GoogleAdsenseApi {
  adsbygoogle: any[] & { loaded: boolean }
}
```

### GoogleAdsenseInput

```ts
export const GoogleAdsenseOptions = object({
  /**
   * The Google Adsense ID.
   */
  client: optional(string()),
})
```
