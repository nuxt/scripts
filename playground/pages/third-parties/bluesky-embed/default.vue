<script setup>
const postUrls = [
  'https://bsky.app/profile/jacobandrewsky.bsky.social/post/3llqqioqpuk2y',
  'https://bsky.app/profile/bsky.app/post/3mgnwwvj3u22a',
]
</script>

<template>
  <div class="p-4 space-y-8">
    <h1 class="text-2xl font-bold">
      Bluesky Embed - Headless
    </h1>

    <div v-for="postUrl in postUrls" :key="postUrl">
      <ScriptBlueskyEmbed :post-url="postUrl">
        <template #default="{ displayName, handle, avatar, text, richText, datetime, likes, likesFormatted, reposts, repostsFormatted, replies, repliesFormatted, images, externalEmbed, postUrl: url, authorUrl }">
          <div class="max-w-[600px] bg-white dark:bg-[#151d28] rounded-2xl border border-gray-200 dark:border-[#2c3a4e] font-sans text-[15px]">
            <!-- Header -->
            <div class="flex items-center gap-3 px-4 pt-4 pb-3">
              <a :href="authorUrl" target="_blank" rel="noopener noreferrer" class="shrink-0">
                <img :src="avatar" :alt="displayName" class="w-[42px] h-[42px] rounded-full bg-gray-100 dark:bg-[#1c2736] ring-1 ring-black/5 dark:ring-white/10">
              </a>
              <a :href="authorUrl" target="_blank" rel="noopener noreferrer" class="min-w-0 no-underline">
                <div class="font-semibold text-gray-900 dark:text-white truncate leading-snug">
                  {{ displayName }}
                </div>
                <div class="text-gray-500 dark:text-[#abb8c9] text-[13px] truncate leading-snug">
                  @{{ handle }}
                </div>
              </a>
              <a :href="url" target="_blank" rel="noopener noreferrer" class="ml-auto shrink-0 text-[#1185fe] hover:text-[#0a6fd4]" aria-label="View on Bluesky">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 568 501" fill="currentColor">
                  <path d="M123.121 33.664C188.241 82.553 258.281 181.68 284 234.873c25.719-53.192 95.759-152.32 160.879-201.21C491.866-1.611 568-28.906 568 57.947c0 17.346-9.945 145.713-15.778 166.555c-20.275 72.453-94.155 90.933-159.875 79.748c114.875 19.831 144.097 85.561 81.022 151.291C363.929 569.326 289.18 462.062 284 449.7c-.36-.86-.36-.86 0 0c-5.18 12.362-79.929 119.626-189.369 5.84c-63.075-65.729-33.853-131.46 81.022-151.29c-65.72 11.184-139.6-7.296-159.875-79.749C9.945 203.659 0 75.291 0 57.946C0-28.906 76.134-1.612 123.121 33.664" />
                </svg>
              </a>
            </div>

            <!-- Content -->
            <div class="px-4 pb-2">
              <!-- eslint-disable-next-line vue/no-v-html -->
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
                  <div class="font-semibold text-gray-900 dark:text-white text-[15px] leading-5 line-clamp-2">
                    {{ externalEmbed.title }}
                  </div>
                  <div class="text-gray-500 dark:text-[#abb8c9] text-[13px] leading-[17px] line-clamp-2 mt-0.5">
                    {{ externalEmbed.description }}
                  </div>
                </div>
              </a>
            </div>

            <!-- Timestamp -->
            <div class="px-4 pt-1 pb-3">
              <a :href="url" target="_blank" rel="noopener noreferrer" class="text-[13px] text-gray-500 dark:text-[#abb8c9] no-underline hover:underline">
                {{ datetime }}
              </a>
            </div>

            <!-- Engagement stats -->
            <div v-if="likes || reposts || replies" class="flex items-center gap-4 px-4 py-3 border-t border-gray-200 dark:border-[#2c3a4e] text-[15px]">
              <span v-if="replies" class="text-gray-500 dark:text-[#abb8c9]">
                <span class="font-semibold text-gray-900 dark:text-white">{{ repliesFormatted }}</span> replies
              </span>
              <span v-if="reposts" class="text-gray-500 dark:text-[#abb8c9]">
                <span class="font-semibold text-gray-900 dark:text-white">{{ repostsFormatted }}</span> reposts
              </span>
              <span v-if="likes" class="text-gray-500 dark:text-[#abb8c9]">
                <span class="font-semibold text-gray-900 dark:text-white">{{ likesFormatted }}</span> likes
              </span>
            </div>

            <!-- Actions -->
            <div class="flex items-center justify-between px-4 py-2 border-t border-gray-200 dark:border-[#2c3a4e]">
              <div class="flex items-center gap-8">
                <button class="text-gray-400 dark:text-[#6f839f] hover:text-[#1185fe] transition-colors" aria-label="Reply">
                  <svg fill="none" width="20" viewBox="0 0 24 24" height="20"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M20 7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2a1 1 0 0 1 1 1v1.918l3.375-2.7a1 1 0 0 1 .625-.218h5a2 2 0 0 0 2-2V7Zm2 8a4 4 0 0 1-4 4h-4.648l-4.727 3.781A1.001 1.001 0 0 1 7 22v-3H6a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v8Z" /></svg>
                </button>
                <button class="text-gray-400 dark:text-[#6f839f] hover:text-green-500 transition-colors" aria-label="Repost">
                  <svg fill="none" width="20" viewBox="0 0 24 24" height="20"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M17.957 2.293a1 1 0 1 0-1.414 1.414L17.836 5H6a3 3 0 0 0-3 3v3a1 1 0 1 0 2 0V8a1 1 0 0 1 1-1h11.836l-1.293 1.293a1 1 0 0 0 1.414 1.414l2.47-2.47a1.75 1.75 0 0 0 0-2.474l-2.47-2.47ZM20 12a1 1 0 0 1 1 1v3a3 3 0 0 1-3 3H6.164l1.293 1.293a1 1 0 1 1-1.414 1.414l-2.47-2.47a1.75 1.75 0 0 1 0-2.474l2.47-2.47a1 1 0 0 1 1.414 1.414L6.164 17H18a1 1 0 0 0 1-1v-3a1 1 0 0 1 1-1Z" /></svg>
                </button>
                <button class="text-gray-400 dark:text-[#6f839f] hover:text-pink-500 transition-colors" aria-label="Like">
                  <svg fill="none" width="20" viewBox="0 0 24 24" height="20"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M16.734 5.091c-1.238-.276-2.708.047-4.022 1.38a1 1 0 0 1-1.424 0C9.974 5.137 8.504 4.814 7.266 5.09c-1.263.282-2.379 1.206-2.92 2.556C3.33 10.18 4.252 14.84 12 19.348c7.747-4.508 8.67-9.168 7.654-11.7-.541-1.351-1.657-2.275-2.92-2.557Zm4.777 1.812c1.604 4-.494 9.69-9.022 14.47a1 1 0 0 1-.978 0C2.983 16.592.885 10.902 2.49 6.902c.779-1.942 2.414-3.334 4.342-3.764 1.697-.378 3.552.003 5.169 1.286 1.617-1.283 3.472-1.664 5.17-1.286 1.927.43 3.562 1.822 4.34 3.764Z" /></svg>
                </button>
              </div>
              <a :href="url" target="_blank" rel="noopener noreferrer" class="text-gray-400 dark:text-[#6f839f] hover:text-[#1185fe] transition-colors" aria-label="Open on Bluesky">
                <svg fill="none" width="20" viewBox="0 0 24 24" height="20"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M11.839 4.744c0-1.488 1.724-2.277 2.846-1.364l.107.094 7.66 7.256.128.134c.558.652.558 1.62 0 2.272l-.128.135-7.66 7.255c-1.115 1.057-2.953.267-2.953-1.27v-2.748c-3.503.055-5.417.41-6.592.97-.997.474-1.525 1.122-2.084 2.14l-.243.46c-.558 1.088-2.09.583-2.08-.515l.015-.748c.111-3.68.777-6.5 2.546-8.415 1.83-1.98 4.63-2.771 8.438-2.884V4.744Z" /></svg>
              </a>
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

        <template #error="{ error }">
          <div class="max-w-[600px] bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 text-red-600 dark:text-red-400">
            Failed to load post: {{ error?.message || 'Unknown error' }}
          </div>
        </template>
      </ScriptBlueskyEmbed>
    </div>
  </div>
</template>
