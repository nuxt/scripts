---
title: X Embed
description: Server-rendered X posts without direct browser requests to X for post JSON or proxied images.
links:
  - label: ScriptXEmbed
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/components/ScriptXEmbed.vue
    size: xs
---

[X (formerly Twitter)](https://x.com) is a social media platform for sharing posts.

[`<ScriptXEmbed>`{lang="html"}](/scripts/x-embed){lang="html"} fetches post data through your Nuxt server and exposes it through slots. Post JSON and images pass through your origin rather than loading X's widget JavaScript.

::script-stats
::

::script-docs{embed}
::

::callout{type="info"}
This script's proxy endpoints use [HMAC URL signing](/docs/guides/first-party#proxy-endpoint-security) when you configure a `NUXT_SCRIPTS_PROXY_SECRET`. See the [security guide](/docs/guides/first-party#proxy-endpoint-security) for setup instructions.
::

This registers the required server API routes (`/_scripts/embed/x` and `/_scripts/embed/x-image`) that handle fetching tweet data and proxying images.

## [`<ScriptXEmbed>`{lang="html"}](/scripts/x-embed){lang="html"}

The post endpoint caches syndication responses for 10 minutes and rewrites profile photos, attached photos, entity media, quoted-post images, and video posters through the image endpoint. Video variant URLs remain unchanged, so rendering one in a `<video>`{lang="html"} element makes a direct browser request to X.

::callout{color="amber"}
The image proxy validates the initial hostname but currently follows redirects without validating each destination. Do not treat that allowlist as a complete SSRF boundary until redirect targets are checked too.
::

### Demo

::code-group

:x-embed-demo{label="Output"}

```vue [Basic Usage]
<template>
  <ScriptXEmbed tweet-id="1754336034228171055">
    <template #default="{ userName, userHandle, text, datetime, likesFormatted }">
      <div class="border rounded-lg p-4 max-w-md">
        <p class="font-bold">
          {{ userName }} (@{{ userHandle }})
        </p>
        <p>{{ text }}</p>
        <p class="text-gray-500 text-sm">
          {{ datetime }} - {{ likesFormatted }} likes
        </p>
      </div>
    </template>
  </ScriptXEmbed>
</template>
```

```vue [Styled Tweet Card]
<template>
  <ScriptXEmbed tweet-id="1754336034228171055">
    <template #default="{ userName, userHandle, userAvatar, text, datetime, likesFormatted, repliesFormatted, photos, isVerified }">
      <div class="max-w-lg bg-white dark:bg-gray-800 rounded-xl border p-4">
        <!-- Header -->
        <div class="flex items-start gap-3 mb-3">
          <img :src="userAvatar" :alt="userName" class="w-12 h-12 rounded-full">
          <div>
            <span class="font-bold">{{ userName }}</span>
            <span v-if="isVerified" class="text-blue-500 ml-1">✓</span>
            <p class="text-gray-500">
              @{{ userHandle }}
            </p>
          </div>
        </div>
        <!-- Content -->
        <p class="mb-3 whitespace-pre-wrap">
          {{ text }}
        </p>
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
  isVerified: boolean | undefined
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
  photos?: Array<NonNullable<XEmbedTweetData['photos']>[number] & {
    proxiedUrl: string
  }>
  video: {
    poster: string
    posterProxied: string
    variants: Array<{ type: string, src: string }>
  } | null
  // Links
  tweetUrl: string
  userUrl: string
  // Quote tweet
  quotedTweet?: XEmbedTweetData
  // Reply context
  isReply: boolean
  replyToUser?: string
  // Helpers
  proxyImage: (imageUrl: string) => string
}
```

### Named Slots

| Slot | Description |
|------|-------------|
| `default` | Main content with slot props |
| `loading` | Shown while fetching tweet data |
| `error` | Shown if tweet fetch fails, receives `{ error }` |

## Data flow

The implementation follows [Cloudflare Zaraz's server-rendered embed approach](https://blog.cloudflare.com/zaraz-supports-server-side-rendering-of-embeds/). No X JavaScript runs in the page, and X does not receive the visitor's IP address for post JSON or proxied images. Rendered video variants and links to X still contact X directly.

::script-types
::
