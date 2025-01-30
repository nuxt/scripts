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

[Google Adsense](https://www.google.com/adsense/start/) allows you to monetize your website by displaying relevant ads from Google.

Nuxt Scripts provides a `useScriptGoogleAdsense` composable and a headless `ScriptGoogleAdsense` component to interact with the Google Adsense.

## Global Setup

You can configure Google Adsense globally in your `nuxt.config.ts` file, so the script is automatically loaded on all pages.

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  scripts: {
    registry: {
      googleAdsense: {
        client: 'ca-pub-<your-id>', // Your Google AdSense ID
        autoAds: true, // Enable Auto Ads
      }
    }
  }
})
```

> **Note**: You can also manage Auto Ads settings directly from [Google Adsense](https://adsense.google.com/start/), where you can control ad types, placements, and optimization for higher revenue.

## `ScriptGoogleAdsense` Component

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

### Component Props

The `ScriptGoogleAdsense` component supports all Google Adsense attributes for the `<ins>` tag. You can find more detailed information in the [Ad Tags Documentation](https://developers.google.com/adsense/platforms/transparent/ad-tags).

At a minimum, you must provide the following attributes:

- `data-ad-client`: Your Google Adsense ID.
- `data-ad-slot`: Your ad slot ID.
- `data-ad-format`: The format of the ad (e.g., `auto`, `rectangle`, `horizontal`, `vertical`, `fluid`, and `autorelaxed`).
- `data-ad-layout`: The layout type (e.g., `in-article`, `in-feed` and `fixed`).
- `data-full-width-responsive`: Set to `true` to make the ad responsive.

### Example Usage with `data-ad-layout`

To specify a layout for your ads (such as "in-article"), you can use the `data-ad-layout` attribute:

```vue
<template>
  <ScriptGoogleAdsense
    data-ad-client="ca-pub-..."
    data-ad-slot="..."
    data-ad-format="fluid"
    data-ad-layout="in-article"
  />
</template>
```

## `useScriptGoogleAdsense` Composable

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

Alternatively, add an `ads.txt` file to your `public` directory:

```plaintext
google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0
```

### GoogleAdsenseApi

This interface defines the structure of the Google Adsense API for better TypeScript support.

```ts
export interface GoogleAdsenseApi {
  adsbygoogle: any[] & { loaded: boolean }
}
```

### GoogleAdsenseInput

You can define the input options for the `useScriptGoogleAdsense` composable using the following structure:

```ts
export const GoogleAdsenseOptions = object({
  /**
   * The Google Adsense ID.
   */
  client: optional(string()),
  /**
   * Enable or disable Auto Ads.
   */
  autoAds: optional(boolean()),
})
```
