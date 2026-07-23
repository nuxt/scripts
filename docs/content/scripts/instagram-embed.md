---
title: Instagram Embed
description: Server-rendered Instagram embeds without direct browser requests to Instagram.
links:
  - label: ScriptInstagramEmbed
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/components/ScriptInstagramEmbed.vue
    size: xs
---

[Instagram](https://instagram.com) hosts photo and video posts.

[`<ScriptInstagramEmbed>`{lang="html"}](/scripts/instagram-embed){lang="html"} fetches embed HTML through your server and proxies supported media and static assets. Changing the post URL or caption setting after client-side navigation refetches your Nuxt endpoint.

::script-stats
::

::script-docs{embed}
::

This registers the required server API routes (`/_scripts/embed/instagram`, `/_scripts/embed/instagram-image`, and `/_scripts/embed/instagram-asset`) that handle fetching embed HTML and proxying images/assets.

## [`<ScriptInstagramEmbed>`{lang="html"}](/scripts/instagram-embed){lang="html"}

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
  html: string // Processed embed HTML with scripts removed and scoped CSS injected
  shortcode: string // The post shortcode (e.g., "C3Sk6d2MTjI")
  postUrl: string // The original post URL
}
```

The rewriter removes `script`, `noscript`, and original `style` elements. It fetches linked Instagram stylesheets, scopes their selectors, and injects the resulting CSS into the returned HTML. It does not perform general HTML sanitization. The default source is restricted to Instagram. If you pass `html` through your own renderer or introduce a custom endpoint, sanitize it according to your application's content policy before using `v-html`.

### Named Slots

| Slot | Description |
|------|-------------|
| `default` | Main content, receives `{ html, shortcode, postUrl }`. By default renders the HTML. |
| `loading` | Shown while fetching embed HTML |
| `error` | Shown if embed fetch fails, receives `{ error }` |

## Supported URL formats

- Posts: `https://www.instagram.com/p/ABC123/`
- Reels: `https://www.instagram.com/reel/ABC123/`
- TV: `https://www.instagram.com/tv/ABC123/`

## How it works

1. **Server-side fetch**: Nuxt fetches the Instagram embed HTML from `{postUrl}/embed/`
2. **Asset proxying**: Images from Instagram's media hosts and assets from `static.cdninstagram.com` are rewritten to proxy through your server
3. **Script removal**: Nuxt removes Instagram's `embed.js` (not needed for static rendering)
4. **Caching**: Nuxt caches responses for 10 minutes at the server level

## Browser privacy

The rendered embed loads no Instagram JavaScript, forwards no Meta `Set-Cookie` response, and sends image and asset requests to your Nuxt server. Instagram sees the server's connection rather than the visitor's. Links in the embed can still take the visitor to Instagram if they choose to open them.

## Limitations

- Only supports single-image posts (galleries show first image only)
- Videos display as static poster images
- Some interactive features are not available (likes, comments)
- The image endpoint rejects redirects. The static-asset endpoint currently follows them without revalidating the destination host.

::script-types
::
