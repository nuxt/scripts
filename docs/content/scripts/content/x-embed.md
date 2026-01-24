---
title: X Embed
description: Server-side rendered X (Twitter) embeds with zero client-side API calls.
links:
  - label: ScriptXEmbed
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/src/runtime/components/ScriptXEmbed.vue
    size: xs
---

[X (formerly Twitter)](https://x.com) is a social media platform for sharing posts.

Nuxt Scripts provides a `ScriptXEmbed` component that fetches tweet data server-side and exposes it via slots for complete styling control. All data is proxied through your server - no client-side API calls to X.

## ScriptXEmbed

The `ScriptXEmbed` component is a headless component that:
- Fetches tweet data server-side via the X syndication API
- Proxies all images through your server for privacy
- Exposes tweet data via scoped slots for custom rendering
- Caches responses for 10 minutes

### Demo

::code-group

```vue [Basic Usage]
<template>
  <ScriptXEmbed tweet-id="1754336034228171055">
    <template #default="{ userName, userHandle, text, datetime, likesFormatted }">
      <div class="border rounded-lg p-4 max-w-md">
        <p class="font-bold">{{ userName }} (@{{ userHandle }})</p>
        <p>{{ text }}</p>
        <p class="text-gray-500 text-sm">{{ datetime }} - {{ likesFormatted }} likes</p>
      </div>
    </template>
  </ScriptXEmbed>
</template>
```

```vue [Styled Tweet Card]
<template>
  <ScriptXEmbed tweet-id="1754336034228171055">
    <template #default="{ userName, userHandle, userAvatar, text, datetime, likesFormatted, repliesFormatted, tweetUrl, photos, isVerified }">
      <div class="max-w-lg bg-white dark:bg-gray-800 rounded-xl border p-4">
        <!-- Header -->
        <div class="flex items-start gap-3 mb-3">
          <img :src="userAvatar" :alt="userName" class="w-12 h-12 rounded-full">
          <div>
            <span class="font-bold">{{ userName }}</span>
            <span v-if="isVerified" class="text-blue-500 ml-1">✓</span>
            <p class="text-gray-500">@{{ userHandle }}</p>
          </div>
        </div>
        <!-- Content -->
        <p class="mb-3 whitespace-pre-wrap">{{ text }}</p>
        <!-- Photos -->
        <div v-if="photos?.length" class="mb-3 rounded-xl overflow-hidden">
          <img v-for="photo in photos" :key="photo.url" :src="photo.proxiedUrl" class="w-full">
        </div>
        <!-- Footer -->
        <div class="flex items-center gap-4 text-gray-500 text-sm">
          <span>{{ datetime }}</span>
          <span>{{ repliesFormatted }} replies</span>
          <span>{{ likesFormatted }} likes</span>
        </div>
      </div>
    </template>

    <template #loading>
      <div class="animate-pulse bg-gray-100 rounded-xl p-4 max-w-lg">
        Loading tweet...
      </div>
    </template>

    <template #error>
      <div class="bg-red-50 border border-red-200 rounded-xl p-4 max-w-lg">
        Failed to load tweet
      </div>
    </template>
  </ScriptXEmbed>
</template>
```

::

### Props

The `ScriptXEmbed` component accepts the following props:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tweetId` | `string` | Required | The ID of the tweet to embed |
| `apiEndpoint` | `string` | `/api/_scripts/x-embed` | Custom API endpoint for fetching tweet data |
| `imageProxyEndpoint` | `string` | `/api/_scripts/x-embed-image` | Custom endpoint for proxying images |
| `rootAttrs` | `HTMLAttributes` | `{}` | Root element attributes |

### Slot Props

The default slot receives the following props:

```ts
interface SlotProps {
  // Raw data
  tweet: XEmbedTweetData
  // User info
  userName: string
  userHandle: string
  userAvatar: string // Proxied URL
  userAvatarOriginal: string // Original X URL
  isVerified: boolean
  // Tweet content
  text: string
  // Formatted values
  datetime: string // "12:47 PM · Feb 5, 2024"
  createdAt: Date
  likes: number
  likesFormatted: string // "1.2K"
  replies: number
  repliesFormatted: string // "234"
  // Media
  photos?: Array<{
    url: string
    proxiedUrl: string
    width: number
    height: number
  }>
  video?: {
    poster: string
    posterProxied: string
    variants: Array<{ type: string; src: string }>
  }
  // Links
  tweetUrl: string
  userUrl: string
  // Quote tweet
  quotedTweet?: XEmbedTweetData
  // Reply context
  isReply: boolean
  replyToUser?: string
  // Helpers
  proxyImage: (url: string) => string
}
```

### Named Slots

| Slot | Description |
|------|-------------|
| `default` | Main content with slot props |
| `loading` | Shown while fetching tweet data |
| `error` | Shown if tweet fetch fails, receives `{ error }` |

## How It Works

1. **Server-side fetch**: Tweet data is fetched from `cdn.syndication.twimg.com` during SSR
2. **Image proxying**: All images are rewritten to proxy through `/api/_scripts/x-embed-image`
3. **Caching**: Responses are cached for 10 minutes at the server level
4. **No client-side API calls**: The user's browser never contacts X directly

This approach is inspired by [Cloudflare Zaraz's embed implementation](https://blog.cloudflare.com/zaraz-supports-server-side-rendering-of-embeds/).

## Privacy Benefits

- No third-party JavaScript loaded
- No cookies set by X
- No direct browser-to-X communication
- User IP addresses not shared with X
- All content served from your domain
