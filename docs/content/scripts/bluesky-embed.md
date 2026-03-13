---

title: Bluesky Embed
description: Server-side rendered Bluesky embeds with zero client-side API calls.
links:
  - label: ScriptBlueskyEmbed
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/src/runtime/components/ScriptBlueskyEmbed.vue
    size: xs

---

[Bluesky](https://bsky.app) is a decentralized social media platform built on the AT Protocol.

Nuxt Scripts provides a [`<ScriptBlueskyEmbed>`{lang="html"}](/scripts/bluesky-embed){lang="html"} component that fetches post data server-side and exposes it via slots for complete styling control. All data is proxied through your server - no client-side API calls to Bluesky.

::script-stats
::

::script-types
::

## Setup

To use the Bluesky embed component, you must enable it in your `nuxt.config`:

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  scripts: {
    registry: {
      blueskyEmbed: true,
    },
  },
})
```

This registers the required server API routes (`/_scripts/embed/bluesky` and `/_scripts/embed/bluesky-image`) that handle fetching post data and proxying images.

## [`<ScriptBlueskyEmbed>`{lang="html"}](/scripts/bluesky-embed){lang="html"}

The [`<ScriptBlueskyEmbed>`{lang="html"}](/scripts/bluesky-embed){lang="html"} component is a headless component that:
- Fetches post data server-side via the Bluesky public API (AT Protocol)
- Proxies all images through your server for privacy
- Converts rich text facets (links, mentions, hashtags) to HTML
- Exposes post data via scoped slots for custom rendering
- Caches responses for 10 minutes
- Respects author opt-out (`!no-unauthenticated` label)

### Demo

::code-group

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
          {{ datetime }} - {{ likesFormatted }} likes
        </p>
      </div>
    </template>
  </ScriptBlueskyEmbed>
</template>
```

```vue [Bluesky Card (Tailwind)]
<template>
  <ScriptBlueskyEmbed post-url="https://bsky.app/profile/bsky.app/post/3mgnwwvj3u22a">
    <template #default="{ displayName, handle, avatar, richText, datetime, likes, likesFormatted, reposts, repostsFormatted, replies, images, externalEmbed, postUrl, authorUrl }">
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
          <div class="text-gray-900 dark:text-white whitespace-pre-wrap break-words leading-[22px] [&_a]:text-[#1185fe] [&_a]:no-underline [&_a:hover]:underline" v-html="richText" />
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
            <img v-if="externalEmbed.thumb" :src="externalEmbed.thumb" class="w-full aspect-video object-cover">
            <div class="px-3 py-2">
              <div class="font-semibold text-gray-900 dark:text-white text-[15px] leading-5 line-clamp-2">{{ externalEmbed.title }}</div>
              <div class="text-gray-500 dark:text-[#abb8c9] text-[13px] leading-[17px] line-clamp-2 mt-0.5">{{ externalEmbed.description }}</div>
              <div class="flex items-center gap-1 mt-1 text-[11px] text-gray-400 dark:text-[#abb8c9]">
                <svg fill="none" viewBox="0 0 24 24" width="12" height="12"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M4.4 9.493C4.14 10.28 4 11.124 4 12a8 8 0 1 0 10.899-7.459l-.953 3.81a1 1 0 0 1-.726.727l-3.444.866-.772 1.533a1 1 0 0 1-1.493.35L4.4 9.493Zm.883-1.84L7.756 9.51l.44-.874a1 1 0 0 1 .649-.52l3.306-.832.807-3.227a7.993 7.993 0 0 0-7.676 3.597ZM2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12Zm8.43.162a1 1 0 0 1 .77-.29l1.89.121a1 1 0 0 1 .494.168l2.869 1.928a1 1 0 0 1 .336 1.277l-.973 1.946a1 1 0 0 1-.894.553h-2.92a1 1 0 0 1-.831-.445L9.225 14.5a1 1 0 0 1 .126-1.262l1.08-1.076Z" /></svg>
                {{ new URL(externalEmbed.uri).hostname }}
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

        <!-- Actions -->
        <div class="flex items-center justify-between px-4 py-2 border-t border-gray-200 dark:border-[#2c3a4e]">
          <div class="flex items-center gap-8">
            <!-- Reply -->
            <button class="text-gray-400 dark:text-[#6f839f] hover:text-[#1185fe] transition-colors" aria-label="Reply">
              <svg fill="none" width="20" viewBox="0 0 24 24" height="20"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M20 7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2a1 1 0 0 1 1 1v1.918l3.375-2.7a1 1 0 0 1 .625-.218h5a2 2 0 0 0 2-2V7Zm2 8a4 4 0 0 1-4 4h-4.648l-4.727 3.781A1.001 1.001 0 0 1 7 22v-3H6a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v8Z" /></svg>
            </button>
            <!-- Repost -->
            <button class="text-gray-400 dark:text-[#6f839f] hover:text-green-500 transition-colors" aria-label="Repost">
              <svg fill="none" width="20" viewBox="0 0 24 24" height="20"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M17.957 2.293a1 1 0 1 0-1.414 1.414L17.836 5H6a3 3 0 0 0-3 3v3a1 1 0 1 0 2 0V8a1 1 0 0 1 1-1h11.836l-1.293 1.293a1 1 0 0 0 1.414 1.414l2.47-2.47a1.75 1.75 0 0 0 0-2.474l-2.47-2.47ZM20 12a1 1 0 0 1 1 1v3a3 3 0 0 1-3 3H6.164l1.293 1.293a1 1 0 1 1-1.414 1.414l-2.47-2.47a1.75 1.75 0 0 1 0-2.474l2.47-2.47a1 1 0 0 1 1.414 1.414L6.164 17H18a1 1 0 0 0 1-1v-3a1 1 0 0 1 1-1Z" /></svg>
            </button>
            <!-- Like -->
            <button class="text-gray-400 dark:text-[#6f839f] hover:text-pink-500 transition-colors" aria-label="Like">
              <svg fill="none" width="20" viewBox="0 0 24 24" height="20"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M16.734 5.091c-1.238-.276-2.708.047-4.022 1.38a1 1 0 0 1-1.424 0C9.974 5.137 8.504 4.814 7.266 5.09c-1.263.282-2.379 1.206-2.92 2.556C3.33 10.18 4.252 14.84 12 19.348c7.747-4.508 8.67-9.168 7.654-11.7-.541-1.351-1.657-2.275-2.92-2.557Zm4.777 1.812c1.604 4-.494 9.69-9.022 14.47a1 1 0 0 1-.978 0C2.983 16.592.885 10.902 2.49 6.902c.779-1.942 2.414-3.334 4.342-3.764 1.697-.378 3.552.003 5.169 1.286 1.617-1.283 3.472-1.664 5.17-1.286 1.927.43 3.562 1.822 4.34 3.764Z" /></svg>
            </button>
          </div>
          <div class="flex items-center gap-4">
            <!-- Share -->
            <a :href="postUrl" target="_blank" rel="noopener noreferrer" class="text-gray-400 dark:text-[#6f839f] hover:text-[#1185fe] transition-colors" aria-label="Open on Bluesky">
              <svg fill="none" width="20" viewBox="0 0 24 24" height="20"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M11.839 4.744c0-1.488 1.724-2.277 2.846-1.364l.107.094 7.66 7.256.128.134c.558.652.558 1.62 0 2.272l-.128.135-7.66 7.255c-1.115 1.057-2.953.267-2.953-1.27v-2.748c-3.503.055-5.417.41-6.592.97-.997.474-1.525 1.122-2.084 2.14l-.243.46c-.558 1.088-2.09.583-2.08-.515l.015-.748c.111-3.68.777-6.5 2.546-8.415 1.83-1.98 4.63-2.771 8.438-2.884V4.744Z" /></svg>
            </a>
          </div>
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
          {{ datetime }} - {{ likesFormatted }} likes
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
  avatarOriginal: string // Original Bluesky CDN URL
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

## How It Works

1. **Server-side fetch**: The server fetches post data from `public.api.bsky.app` (AT Protocol) during SSR
2. **Handle resolution**: The server resolves handles to DIDs for reliable post lookup
3. **Image proxying**: The server rewrites all images to proxy through `/_scripts/embed/bluesky-image`
4. **Rich text**: The component converts Bluesky facets (links, mentions, hashtags) to HTML
5. **Caching**: The server caches responses for 10 minutes
6. **No client-side API calls**: The user's browser never contacts Bluesky directly

## Privacy Benefits

- No third-party JavaScript loaded
- No cookies set by Bluesky
- No direct browser-to-Bluesky communication
- User IP addresses not shared with Bluesky
- All content served from your domain

## Author Opt-Out

The component respects Bluesky's `!no-unauthenticated` label. If a post author has opted out of external embedding, the API returns a 403 error and the component shows the error slot.
