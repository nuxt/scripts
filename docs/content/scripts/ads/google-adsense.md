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

Nuxt Scripts provides a `useScriptGoogleAdsense` composable and a headless `ScriptGoogleAdsense` component to interact with Google Adsense.

## Global Setup

You can configure Google Adsense globally in your `nuxt.config.ts` file so the script is automatically loaded on all pages.

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  scripts: {
    registry: {
      googleAdsense: {
        client: 'ca-pub-<your-id>', // Your Google AdSense Publisher ID
        autoAds: true, // Enable Auto Ads
      }
    }
  }
})
```

## Where to Find `<your-id>`
Your **Google AdSense Publisher ID** (also known as `ca-pub-XXXXXXX`) can be found in your **Google AdSense Account**:  

1. Log in to your **Google AdSense** account.  
2. Navigate to **Account > Settings** (click on your profile icon > "Account information").  
3. Locate the **Publisher ID** under **Account Information**.  
4. Replace `<your-id>` in the config above with your actual ID.  

> **Note**: You can also manage Auto Ads settings directly from [Google Adsense](https://adsense.google.com/start/), where you can control ad types, placements, and optimization for higher revenue.

## Site Ownership Verification

### Using *meta tag* for Verification
When a `client` is provided, a **meta tag** will be inserted on the page so that Google can verify your site ownership.

```ts
const adsense = useScriptGoogleAdsense({
  client: 'ca-pub-<your-id>',
})
```

The generated meta tag will look like this:

```html
<meta name="google-adsense-account" content="ca-pub-<your-id>">
```

### Using `ads.txt` for Verification
Alternatively, add an `ads.txt` file to your `public/` directory to ensure ad revenue eligibility.

1. Create a new file: `public/ads.txt`
2. Add the following content:

```plaintext
google.com, pub-<your-id>, DIRECT, f08c47fec0942fa0
```

3. Replace `<your-id>` with your **AdSense Publisher ID**.

> **Why is `ads.txt` important?**  
> Adding this file helps prevent **ad fraud** and ensures that only your site can display your ads.

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

### Component Props

- `data-ad-client`: **(Required)** Your **Google Adsense Publisher ID** (`ca-pub-XXXXXXXXXX`).
- `data-ad-slot`: **(Required)** Your **Ad Slot ID** (available in AdSense dashboard).
- `data-ad-format`: Ad format type (`auto`, `rectangle`, `horizontal`, `vertical`, `fluid`, `autorelaxed`).
- `data-ad-layout`: Layout (`in-article`, `in-feed`, `fixed`).
- `data-full-width-responsive`: **Set to `true`** to make the ad responsive.

### Example Usage with `data-ad-layout`

To specify a layout for your ads (such as "in-article"), you can use the `data-ad-layout` attribute:

```vue
<template>
  <ScriptGoogleAdsense
    data-ad-client="ca-pub-<your-id>"
    data-ad-slot="1234567890"
    data-ad-format="fluid"
    data-ad-layout="in-article"
  />
</template>
```

### How to Handle Ad-Blockers?

You can use these hooks to add a fallback when the Google Adsense script is blocked.

```vue
<template>
  <ScriptGoogleAdsense
    data-ad-client="ca-pub-..."
    data-ad-slot="..."
  >
    <template #error>
      <!-- Fallback content -->
      Please support us by disabling your ad blocker.
    </template>
  </ScriptGoogleAdsense>
</template>
```

## `useScriptGoogleAdsense` Composable

The `useScriptGoogleAdsense` composable gives fine-grain control over the Adsense script management.

```ts
export function useScriptGoogleAdsense<T extends GoogleAdsenseApi>(_options?: GoogleAdsenseInput) {}
```

See the [Registry Scripts Guide](/docs/guides/registry-scripts) for advanced usage.

## GoogleAdsenseApi Interface

This interface defines the structure of the Google Adsense API for better TypeScript support.

```ts
export interface GoogleAdsenseApi {
  adsbygoogle: any[] & { loaded: boolean }
}
```

## GoogleAdsenseInput

You can define the input options for the `useScriptGoogleAdsense` composable using the following structure:

```ts
export const GoogleAdsenseOptions = object({
  /**
   * The Google Adsense Publisher ID.
   */
  client: optional(string()),
  /**
   * Enable or disable Auto Ads.
   */
  autoAds: optional(boolean()),
})
```
