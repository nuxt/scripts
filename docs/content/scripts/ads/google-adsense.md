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

[Google AdSense](https://www.google.com/adsense/start/) allows you to monetize your website by displaying relevant ads from Google.

Nuxt Scripts provides:

- `useScriptGoogleAdsense`: A composable to manage Google AdSense dynamically.
- `<ScriptGoogleAdsense>`: A headless component to embed ads directly in your Nuxt app.

## Global Setup

You can configure Google AdSense **globally** in your `nuxt.config.ts` so that the script is automatically loaded on all pages.

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  scripts: {
    registry: {
      googleAdsense: {
        client: "ca-pub-<your-id>", // Your Google AdSense Publisher ID
        autoAds: true, // Enable Auto Ads
      },
    },
  },
});
```

## Where to Find `<your-id>` (Publisher ID)

Your **Google AdSense Publisher ID** (also known as `ca-pub-XXXXXXX`) can be found in your **Google AdSense Account**:

1. Log in to your **Google AdSense** account.
2. Navigate to **Account > Settings** (click on your profile icon > "Account information").
3. Locate the **Publisher ID** under **Account Information**.
4. Replace `<your-id>` in the config above with your actual ID.

::callout{icon="i-heroicons-light-bulb" to="https://adsense.google.com/start/" target="_blank"}
You can also manage **Auto Ads settings** from your **Google AdSense Dashboard** to control *ad types, placements, and revenue optimization*.
::

## Site Ownership Verification

### Automatic Meta Tag Insertion

If a `client` is provided, a **meta tag** will be inserted on the page **automatically** for Google to verify your site ownership.

::tabs
  ::div
  ---
  label: Example
  icon: i-heroicons-code-bracket-square
  ---
  ```ts [nuxt.config.ts]
  export default defineNuxtConfig({
    scripts: {
        registry: {
          googleAdsense: {
            client: "ca-pub-<your-id>", // AdSense Publisher ID
          },
        },
    },
  });
  ```
  ::
  ::div
  ---
  label: Output
  icon: i-heroicons-magnifying-glass-circle
  ---
  ```html
  <meta name="google-adsense-account" content="ca-pub-<your-id>" />
  ```
  ::
::

### Using `ads.txt` for Verification

Google recommends adding an `ads.txt` file for **ad revenue eligibility**.

#### Steps:

1. Create a new file: `public/ads.txt`
2. Add the following content:
   ```plaintext
   google.com, pub-<your-id>, DIRECT, f08c47fec0942fa0
   ```
3. Replace `<your-id>` with your **AdSense Publisher ID**.

::callout{icon="i-heroicons-light-bulb"}
**Why use `ads.txt`?** It helps **prevent ad fraud** and ensures that **only your site** can display your ads.
::

## Enabling Auto Ads

Auto Ads allow Google to **automatically** place ads for **better optimization**.

::tabs
  ::div
  ---
  label: Example
  icon: i-heroicons-code-bracket-square
  ---
  ```ts [nuxt.config.ts]
  export default defineNuxtConfig({
    scripts: {
      registry: {
        googleAdsense: {
          client: "ca-pub-<your-id>", // AdSense Publisher ID
          autoAds: true, // Enable Auto Ads
        },
      },
    },
  });
  ```
  ::
  ::div
  ---
  label: Output
  icon: i-heroicons-magnifying-glass-circle
  ---
  ```html
  <script>
  (adsbygoogle = window.adsbygoogle || []).push({
    google_ad_client: "ca-pub-<your-id>",
    enable_page_level_ads: true,
  });
  </script>
  ```
  ::
::

## Using `ScriptGoogleAdsense` Component

It provides a simple way to **embed ads** in your Nuxt app.

```vue
<template>
  <ScriptGoogleAdsense
    data-ad-client="ca-pub-<your-id>"
    data-ad-slot="1234567890"
    data-ad-format="auto"
  />
</template>
```

### Component Props

| Prop                         | Description                                                           |
| ---------------------------- | --------------------------------------------------------------------- |
| `data-ad-client`             | Your **Google Adsense Publisher ID**(`ca-pub-XXXXXXXXXX`).            |
| `data-ad-slot`               | Your **Ad Slot ID** (available in AdSense dashboard).                 |
| `data-ad-format`             | Ad format type (`auto`, `rectangle`, `horizontal`, `vertical`, `fluid`, `autorelaxed`). |
| `data-ad-layout`             | Layout (`in-article`, `in-feed`, `fixed`).                            |
| `data-full-width-responsive` | **Set to `true`** to make the ad responsive.                          |

#### Example Usage with `data-ad-layout`

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

## How to Handle Ad-Blockers?

If a user has an **ad-blocker enabled**, you can show **fallback content**.

```vue
<template>
  <ScriptGoogleAdsense data-ad-client="ca-pub-..." data-ad-slot="...">
    <template #error>
      <!-- Fallback content -->
      <p>Please support us by disabling your ad blocker.</p>
    </template>
  </ScriptGoogleAdsense>
</template>
```

## Using `useScriptGoogleAdsense` Composable

The `useScriptGoogleAdsense` composable allows **fine-grain control** over the AdSense script.

```ts
export function useScriptGoogleAdsense<T extends GoogleAdsenseApi>(
  _options?: GoogleAdsenseInput
) {}
```

See the [Registry Scripts Guide](/docs/guides/registry-scripts) for advanced usage.

## GoogleAdsenseApi Interface

This interface defines the structure of the Google Adsense API for better TypeScript support.

```ts
export interface GoogleAdsenseApi {
  adsbygoogle: any[] & { loaded: boolean };
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
});
```

::callout{icon="i-heroicons-light-bulb" to="https://support.google.com/adsense" target="_blank"}
Need more help? Check out the official **Google AdSense Guide**
::
