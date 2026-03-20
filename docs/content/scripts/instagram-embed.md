---
title: Instagram Embed
description: Server-side rendered Instagram embeds with zero client-side API calls.
links:
  - label: ScriptInstagramEmbed
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/src/runtime/components/ScriptInstagramEmbed.vue
    size: xs
---

[Instagram](https://instagram.com) is a photo and video sharing social media platform.

Nuxt Scripts provides a [`<ScriptInstagramEmbed>`{lang="html"}](/scripts/instagram-embed){lang="html"} component that fetches Instagram embed HTML server-side and proxies all assets through your server - no client-side API calls to Instagram.

::script-stats
::

::script-types
::

## Setup

To use the Instagram embed component, you must enable it in your `nuxt.config`:

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  scripts: {
    registry: {
      instagramEmbed: true,
    },
  },
})
```

This registers the required server API routes (`/_scripts/embed/instagram`, `/_scripts/embed/instagram-image`, and `/_scripts/embed/instagram-asset`) that handle fetching embed HTML and proxying images/assets.

## [`<ScriptInstagramEmbed>`{lang="html"}](/scripts/instagram-embed){lang="html"}

The [`<ScriptInstagramEmbed>`{lang="html"}](/scripts/instagram-embed){lang="html"} component:
- Fetches the official Instagram embed HTML server-side
- Rewrites all image and asset URLs to proxy through your server
- Removes Instagram's embed.js script (not needed)
- Caches responses for 10 minutes

### Demo

::code-group

:instagram-embed-demo{label="Output"}

```vue [Basic Usage]
<template>
  <ScriptInstagramEmbed
    post-url="https://www.instagram.com/p/C3Sk6d2MTjI/"
    :captions="true"
  />
</template>
```

```vue [With Custom Loading/Error States]
<template>
  <ScriptInstagramEmbed
    post-url="https://www.instagram.com/p/C3Sk6d2MTjI/"
    :captions="true"
  >
    <template #loading>
      <div class="animate-pulse bg-gray-100 rounded-lg p-4 aspect-square max-w-md">
        Loading Instagram post...
      </div>
    </template>

    <template #error>
      <div class="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md">
        Failed to load Instagram post
      </div>
    </template>
  </ScriptInstagramEmbed>
</template>
```

```vue [Custom Rendering]
<template>
  <ScriptInstagramEmbed post-url="https://www.instagram.com/p/C3Sk6d2MTjI/">
    <template #default="{ html, shortcode, postUrl }">
      <div class="instagram-wrapper">
        <a :href="postUrl" target="_blank" class="text-sm text-gray-500 mb-2 block">
          View on Instagram ({{ shortcode }})
        </a>

        <div v-html="html" />
      </div>
    </template>
  </ScriptInstagramEmbed>
</template>
```

::

### Slot Props

The default slot receives:

```ts
interface SlotProps {
  html: string // The processed embed HTML
  shortcode: string // The post shortcode (e.g., "C3Sk6d2MTjI")
  postUrl: string // The original post URL
}
```

### Named Slots

| Slot | Description |
|------|-------------|
| `default` | Main content, receives `{ html, shortcode, postUrl }`. By default renders the HTML. |
| `loading` | Shown while fetching embed HTML |
| `error` | Shown if embed fetch fails, receives `{ error }` |

## Supported URL Formats

- Posts: `https://www.instagram.com/p/ABC123/`
- Reels: `https://www.instagram.com/reel/ABC123/`
- TV: `https://www.instagram.com/tv/ABC123/`

## How It Works

1. **Server-side fetch**: Nuxt fetches the Instagram embed HTML from `{postUrl}/embed/`
2. **Asset proxying**: All images from `scontent.cdninstagram.com` and assets from `static.cdninstagram.com` are rewritten to proxy through your server
3. **Script removal**: Nuxt removes Instagram's `embed.js` (not needed for static rendering)
4. **Caching**: Nuxt caches responses for 10 minutes at the server level

This approach is inspired by [Cloudflare Zaraz's embed implementation](https://blog.cloudflare.com/zaraz-supports-server-side-rendering-of-embeds/).

## Privacy Benefits

- No third-party JavaScript loaded
- No cookies set by Instagram/Meta
- No direct browser-to-Instagram communication
- User IP addresses not shared with Instagram
- All content served from your domain

## Limitations

- Only supports single-image posts (galleries show first image only)
- Videos display as static poster images
- Some interactive features are not available (likes, comments)
