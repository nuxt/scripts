---
title: Google AdSense
description: Show Google AdSense ads in your Nuxt app.
links:
  - label: useScriptGoogleAdsense
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/google-adsense.ts
    size: xs
  - label: "<ScriptGoogleAdsense>"
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/components/ScriptGoogleAdsense.vue
    size: xs
---

[Google AdSense](https://www.google.com/adsense/start/) serves Google ads on your site.

Choose the API that matches the placement:

- [`useScriptGoogleAdsense()`{lang="ts"}](/scripts/google-adsense){lang="ts"} loads the `adsbygoogle` queue.
- `<ScriptGoogleAdsense>`{lang="html"} renders an ad unit.

::script-stats
::

::script-docs
::

## Where to find `<your-id>`{lang="html"} (publisher ID)

Find your [Google AdSense publisher ID](https://support.google.com/adsense/answer/2923881?hl=en) under **Account > Settings > Account information**. It appears as `pub-…` in your account and as `ca-pub-…` in ad code. Replace `<your-id>`{lang="html"} below with that value.

::callout{icon="i-heroicons-light-bulb" to="https://adsense.google.com/start/" target="_blank"}
Manage ad types and placements from the **Auto ads** settings in your AdSense dashboard.
::

## Site ownership verification

### Automatic meta tag insertion

If you provide a `client`, Nuxt automatically inserts a **meta tag** on the page for Google to verify your site ownership.

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
          client: 'ca-pub-<your-id>', // AdSense Publisher ID
        },
      },
    },
  })
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

### Adding `ads.txt`

Google recommends adding an `ads.txt` file to identify the advertising systems authorized to sell your inventory and reduce counterfeit inventory.

#### Steps

1. Create a new file: `public/ads.txt`
2. Add the following content:
   ```plaintext
   google.com, pub-<your-id>, DIRECT, f08c47fec0942fa0
   ```
3. Replace `<your-id>`{lang="html"} with your **AdSense Publisher ID**.

::callout{icon="i-heroicons-light-bulb" to="https://support.google.com/adsense/answer/12171612" target="_blank"}
An `ads.txt` file does not replace AdSense's site review. After publishing it, check the file's status in your AdSense dashboard.
::

## Enabling Auto ads

[Auto ads](https://support.google.com/adsense/answer/9261805?hl=en) let Google choose placements based on the page's layout, content, and existing ads. You can still control formats and exclude pages or areas in AdSense.

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
          client: 'ca-pub-<your-id>', // AdSense Publisher ID
          autoAds: true, // Enable Auto Ads
        },
      },
    },
  })
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

## Using the [`<ScriptGoogleAdsense>`{lang="html"}](/scripts/google-adsense){lang="html"} component

`<ScriptGoogleAdsense>`{lang="html"} renders one ad unit:

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
| `data-ad-client`             | Your **Google AdSense publisher ID** (`ca-pub-XXXXXXXXXX`).           |
| `data-ad-slot`               | Your **Ad Slot ID** (available in AdSense dashboard).                 |
| `data-ad-format`             | Ad format type (`auto`, `rectangle`, `horizontal`, `vertical`, `fluid`, `autorelaxed`). |
| `data-ad-layout`             | Layout (`in-article`, `in-feed`, `fixed`).                            |
| `data-full-width-responsive` | **Set to `true`** to make the ad responsive.                          |

#### Example using `data-ad-layout`

Set `data-ad-layout` for layouts such as `in-article`:

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

## Handling ad blockers

Use the `error` slot for visitors whose ad blocker stops the script:

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

## Using the [`useScriptGoogleAdsense()`{lang="ts"}](/scripts/google-adsense){lang="ts"} composable

Use [`useScriptGoogleAdsense()`{lang="ts"}](/scripts/google-adsense){lang="ts"} when you need the `adsbygoogle` queue without an ad-unit component.

```ts
export function useScriptGoogleAdsense<T extends GoogleAdsenseApi>(
  _options?: GoogleAdsenseInput
) {}
```

See the [Registry Scripts guide](/docs/guides/registry-scripts) for trigger and loading options.

::callout{icon="i-heroicons-light-bulb" to="https://support.google.com/adsense" target="_blank"}
See the official **Google AdSense guide**.
::

::script-types
::
