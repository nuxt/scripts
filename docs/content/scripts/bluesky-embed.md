---
title: Bluesky Embed
description: Server-rendered Bluesky embeds without browser requests to Bluesky.
links:
  - label: ScriptBlueskyEmbed
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/components/ScriptBlueskyEmbed.vue
    size: xs
---

[Bluesky](https://bsky.app) is a decentralized social media platform built on the [AT Protocol](https://atproto.com/).

[`<ScriptBlueskyEmbed>`{lang="html"}](/scripts/bluesky-embed){lang="html"} fetches post data through your Nuxt server and exposes scoped slots, so the markup and styling stay in your app. The upstream request uses Bluesky's [`getPostThread`](https://docs.bsky.app/docs/tutorials/viewing-threads) API.

::script-stats
::

::script-docs{embed}
::

::callout{type="info"}
This script's proxy endpoints use [HMAC URL signing](/docs/guides/first-party#proxy-endpoint-security) when you configure a `NUXT_SCRIPTS_PROXY_SECRET`. See the [security guide](/docs/guides/first-party#proxy-endpoint-security) for setup instructions.
::

Enabling the integration registers `/_scripts/embed/bluesky` for post data and `/_scripts/embed/bluesky-image` for images.

## [`<ScriptBlueskyEmbed>`{lang="html"}](/scripts/bluesky-embed){lang="html"}

The post endpoint caches thread responses for 10 minutes and handle-to-DID lookups for 24 hours. It rewrites avatars, post images, and external-card thumbnails through the image endpoint. The component also turns rich-text facets into links for the `richText` slot prop.

::callout{color="amber"}
`richText` is escaped HTML, but the current facet converter does not restrict link URI schemes. If you embed posts you do not control, render the plain `text` prop or sanitize `richText` with an allowlist that rejects schemes such as `javascript:`.
::

::callout{color="amber"}
The image proxy validates the initial hostname but currently follows redirects without validating each destination. Do not treat that allowlist as a complete SSRF boundary until redirect targets are checked too.
::

### Demo

::code-group

:bluesky-embed-demo{label="Output"}

```vue [Basic Usage]
<template>
  <ScriptBlueskyEmbed post-url="https://bsky.app/profile/bsky.app/post/3mgnwwvj3u22a">
    <template #default="{ displayName, handle, text, datetime, likesFormatted }">
      <div class="border rounded-lg p-4 max-w-md">
        <p class="font-bold">
          {{ displayName }} (@{{ handle }})
        </p>
        <p>{{ text }}</p>
        <p class="text-gray-500 text-sm">
          {{ datetime }} · {{ likesFormatted }} likes
        </p>
      </div>
    </template>
  </ScriptBlueskyEmbed>
</template>
```

```vue [Bluesky Card (Tailwind)]
<template>
  <ScriptBlueskyEmbed post-url="https://bsky.app/profile/bsky.app/post/3mgnwwvj3u22a">
    <template #default="{ displayName, handle, avatar, text, datetime, likes, likesFormatted, reposts, repostsFormatted, replies, images, externalEmbed, postUrl, authorUrl }">
      <div class="max-w-[600px] bg-white dark:bg-[#151d28] rounded-2xl border border-gray-200 dark:border-[#2c3a4e] font-sans text-[15px]">
        <!-- Header -->
        <div class="flex items-center gap-3 px-4 pt-4 pb-3">
          <a :href="authorUrl" target="_blank" rel="noopener noreferrer" class="shrink-0">
            <img :src="avatar" :alt="displayName" class="w-[42px] h-[42px] rounded-full bg-gray-100 dark:bg-[#1c2736] ring-1 ring-black/5 dark:ring-white/10">
          </a>
          <a :href="authorUrl" target="_blank" rel="noopener noreferrer" class="min-w-0 no-underline">
            <div class="font-semibold text-gray-900 dark:text-white truncate leading-snug">{{ displayName }}</div>
            <div class="text-gray-500 dark:text-[#abb8c9] text-[13px] truncate leading-snug">@{{ handle }}</div>
          </a>
          <!-- Bluesky butterfly -->
          <a :href="postUrl" target="_blank" rel="noopener noreferrer" class="ml-auto shrink-0 text-[#1185fe] hover:text-[#0a6fd4]" aria-label="View on Bluesky">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 568 501" fill="currentColor">
              <path d="M123.121 33.664C188.241 82.553 258.281 181.68 284 234.873c25.719-53.192 95.759-152.32 160.879-201.21C491.866-1.611 568-28.906 568 57.947c0 17.346-9.945 145.713-15.778 166.555c-20.275 72.453-94.155 90.933-159.875 79.748c114.875 19.831 144.097 85.561 81.022 151.291C363.929 569.326 289.18 462.062 284 449.7c-.36-.86-.36-.86 0 0c-5.18 12.362-79.929 119.626-189.369 5.84c-63.075-65.729-33.853-131.46 81.022-151.29c-65.72 11.184-139.6-7.296-159.875-79.749C9.945 203.659 0 75.291 0 57.946C0-28.906 76.134-1.612 123.121 33.664" />
            </svg>
          </a>
        </div>

        <!-- Content -->
        <div class="px-4 pb-2">
          <div class="text-gray-900 dark:text-white whitespace-pre-wrap break-words leading-[22px]">
            {{ text }}
          </div>
        </div>

        <!-- Images -->
        <div v-if="images?.length" class="px-4 pb-2">
          <div class="rounded-xl overflow-hidden border border-gray-200 dark:border-[#2c3a4e]" :class="images.length > 1 ? 'grid grid-cols-2 gap-0.5' : ''">
            <img v-for="(img, i) in images" :key="i" :src="img.fullsize" :alt="img.alt" class="w-full object-cover" :class="images.length > 1 ? 'aspect-square' : ''">
          </div>
        </div>

        <!-- External embed card -->
        <div v-if="externalEmbed" class="px-4 pb-2">
          <a :href="externalEmbed.uri" target="_blank" rel="noopener noreferrer" class="block rounded-xl border border-gray-200 dark:border-[#2c3a4e] overflow-hidden no-underline hover:bg-gray-50 dark:hover:bg-[#1c2736] transition-colors">
            <img v-if="externalEmbed.thumb" :src="externalEmbed.thumb" :alt="externalEmbed.title" class="w-full aspect-video object-cover">
            <div class="px-3 py-2">
              <div class="font-semibold text-gray-900 dark:text-white text-[15px] leading-5 line-clamp-2">{{ externalEmbed.title }}</div>
              <div class="text-gray-500 dark:text-[#abb8c9] text-[13px] leading-[17px] line-clamp-2 mt-0.5">{{ externalEmbed.description }}</div>
              <div class="flex items-center gap-1 mt-1 text-[11px] text-gray-400 dark:text-[#abb8c9]">
                <svg fill="none" viewBox="0 0 24 24" width="12" height="12"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M4.4 9.493C4.14 10.28 4 11.124 4 12a8 8 0 1 0 10.899-7.459l-.953 3.81a1 1 0 0 1-.726.727l-3.444.866-.772 1.533a1 1 0 0 1-1.493.35L4.4 9.493Zm.883-1.84L7.756 9.51l.44-.874a1 1 0 0 1 .649-.52l3.306-.832.807-3.227a7.993 7.993 0 0 0-7.676 3.597ZM2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12Zm8.43.162a1 1 0 0 1 .77-.29l1.89.121a1 1 0 0 1 .494.168l2.869 1.928a1 1 0 0 1 .336 1.277l-.973 1.946a1 1 0 0 1-.894.553h-2.92a1 1 0 0 1-.831-.445L9.225 14.5a1 1 0 0 1 .126-1.262l1.08-1.076Z" /></svg>
                {{ externalEmbed.uri }}
              </div>
            </div>
          </a>
        </div>

        <!-- Timestamp -->
        <div class="px-4 pt-1 pb-3">
          <a :href="postUrl" target="_blank" rel="noopener noreferrer" class="text-[13px] text-gray-500 dark:text-[#abb8c9] no-underline hover:underline">
            {{ datetime }}
          </a>
        </div>

        <!-- Engagement stats -->
        <div v-if="likes || reposts || replies" class="flex items-center gap-4 px-4 py-3 border-t border-gray-200 dark:border-[#2c3a4e] text-[15px]">
          <a v-if="likes" :href="`${postUrl}/liked-by`" target="_blank" rel="noopener noreferrer" class="no-underline hover:underline text-gray-500 dark:text-[#abb8c9]">
            <span class="font-semibold text-gray-900 dark:text-white">{{ likesFormatted }}</span> likes
          </a>
          <span v-if="reposts" class="text-gray-500 dark:text-[#abb8c9]">
            <span class="font-semibold text-gray-900 dark:text-white">{{ repostsFormatted }}</span> reposts
          </span>
        </div>
      </div>
    </template>

    <template #loading>
      <div class="max-w-[600px] bg-white dark:bg-[#151d28] rounded-2xl border border-gray-200 dark:border-[#2c3a4e] p-4">
        <div class="animate-pulse flex gap-3">
          <div class="w-[42px] h-[42px] rounded-full bg-gray-200 dark:bg-[#2c3a4e]" />
          <div class="flex-1 space-y-2 py-1">
            <div class="h-4 bg-gray-200 dark:bg-[#2c3a4e] rounded w-1/3" />
            <div class="h-3 bg-gray-200 dark:bg-[#2c3a4e] rounded w-1/4" />
          </div>
        </div>
        <div class="animate-pulse mt-3 space-y-2">
          <div class="h-4 bg-gray-200 dark:bg-[#2c3a4e] rounded w-full" />
          <div class="h-4 bg-gray-200 dark:bg-[#2c3a4e] rounded w-5/6" />
          <div class="h-4 bg-gray-200 dark:bg-[#2c3a4e] rounded w-2/3" />
        </div>
      </div>
    </template>

    <template #error>
      <div class="max-w-[600px] bg-white dark:bg-[#151d28] rounded-2xl border border-gray-200 dark:border-[#2c3a4e] p-4 text-center text-gray-500 dark:text-[#abb8c9]">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 568 501" fill="currentColor" class="mx-auto mb-2 opacity-30"><path d="M123.121 33.664C188.241 82.553 258.281 181.68 284 234.873c25.719-53.192 95.759-152.32 160.879-201.21C491.866-1.611 568-28.906 568 57.947c0 17.346-9.945 145.713-15.778 166.555c-20.275 72.453-94.155 90.933-159.875 79.748c114.875 19.831 144.097 85.561 81.022 151.291C363.929 569.326 289.18 462.062 284 449.7c-.36-.86-.36-.86 0 0c-5.18 12.362-79.929 119.626-189.369 5.84c-63.075-65.729-33.853-131.46 81.022-151.29c-65.72 11.184-139.6-7.296-159.875-79.749C9.945 203.659 0 75.291 0 57.946C0-28.906 76.134-1.612 123.121 33.664" /></svg>
        Failed to load post
      </div>
    </template>
  </ScriptBlueskyEmbed>
</template>
```

```vue [Minimal]
<template>
  <ScriptBlueskyEmbed post-url="https://bsky.app/profile/bsky.app/post/3mgnwwvj3u22a">
    <template #default="{ displayName, handle, text, datetime, likesFormatted }">
      <div class="border rounded-lg p-4 max-w-md">
        <p class="font-bold">
          {{ displayName }} (@{{ handle }})
        </p>
        <p>{{ text }}</p>
        <p class="text-gray-500 text-sm">
          {{ datetime }} · {{ likesFormatted }} likes
        </p>
      </div>
    </template>
  </ScriptBlueskyEmbed>
</template>
```

::

### Slot Props

The default slot receives the following props:

```ts
interface SlotProps {
  // Raw data
  post: BlueskyEmbedPostData
  // Author info
  displayName: string
  handle: string
  avatar: string // Proxied URL
  isVerified: boolean
  // Post content
  text: string // Plain text
  richText: string // HTML with links, mentions, and hashtags
  langs?: string[] // Language codes
  // Formatted values
  datetime: string // "12:47 PM · Feb 5, 2024"
  createdAt: Date
  likes: number
  likesFormatted: string // "1.2K"
  reposts: number
  repostsFormatted: string // "234"
  replies: number
  repliesFormatted: string // "42"
  quotes: number
  quotesFormatted: string // "12"
  // Media
  images?: Array<{
    thumb: string // Proxied thumbnail URL
    fullsize: string // Proxied full-size URL
    alt: string
    aspectRatio?: { width: number, height: number }
  }>
  externalEmbed?: {
    uri: string
    title: string
    description: string
    thumb?: string // Proxied URL
  }
  // Links
  postUrl: string
  authorUrl: string
  // Helpers
  proxyImage: (url: string) => string
}
```

### Named Slots

| Slot | Description |
|------|-------------|
| `default` | Main content with slot props |
| `loading` | Shown while fetching post data |
| `error` | Shown if post fetch fails, receives `{ error }` |

## Data flow

No Bluesky JavaScript runs in the page. Post JSON and images reach the browser from your origin, so Bluesky does not receive the visitor's IP address for those requests. Links in your rendering still open Bluesky when clicked.

## Author Opt-Out

The endpoint rejects posts or authors carrying Bluesky's [`!no-unauthenticated` label](https://docs.bsky.app/docs/advanced-guides/moderation#global-label-values) with a 403 response, and the component shows the error slot. The label means the content should be unavailable to logged-out users in clients that honor it; it is broader than an embed-only preference.

::script-types
::
