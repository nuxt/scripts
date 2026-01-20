<script setup>
// Example tweet IDs for testing
const tweetIds = [
  '1754336034228171055', // Example tweet
  '1846337112850932088', // Another example
]
</script>

<template>
  <div class="p-4 space-y-8">
    <h1 class="text-2xl font-bold">
      X (Twitter) Embed - Headless
    </h1>

    <div v-for="tweetId in tweetIds" :key="tweetId" class="border rounded-lg p-4">
      <ScriptXEmbed :tweet-id="tweetId">
        <template #default="{ userName, userHandle, userAvatar, text, datetime, likesFormatted, repliesFormatted, tweetUrl, photos, isVerified }">
          <div class="max-w-lg bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <!-- Header -->
            <div class="flex items-start gap-3 mb-3">
              <img :src="userAvatar" :alt="userName" class="w-12 h-12 rounded-full">
              <div class="flex-1">
                <div class="flex items-center gap-1">
                  <span class="font-bold text-gray-900 dark:text-white">{{ userName }}</span>
                  <svg v-if="isVerified" class="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" />
                  </svg>
                </div>
                <a :href="`https://x.com/${userHandle}`" class="text-gray-500 text-sm hover:underline">@{{ userHandle }}</a>
              </div>
              <a :href="tweetUrl" target="_blank" class="text-gray-400 hover:text-gray-600">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            </div>

            <!-- Content -->
            <p class="text-gray-900 dark:text-white mb-3 whitespace-pre-wrap">
              {{ text }}
            </p>

            <!-- Photos -->
            <div v-if="photos?.length" class="mb-3 rounded-xl overflow-hidden">
              <img v-for="photo in photos" :key="photo.url" :src="photo.proxiedUrl" class="w-full">
            </div>

            <!-- Footer -->
            <div class="flex items-center gap-4 text-gray-500 text-sm">
              <span>{{ datetime }}</span>
            </div>
            <div class="flex items-center gap-6 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-gray-500">
              <span class="flex items-center gap-1">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {{ repliesFormatted }}
              </span>
              <span class="flex items-center gap-1">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {{ likesFormatted }}
              </span>
            </div>
          </div>
        </template>

        <template #loading>
          <div class="max-w-lg bg-gray-100 dark:bg-gray-800 rounded-xl p-4 animate-pulse">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-full" />
              <div class="space-y-2">
                <div class="h-4 w-32 bg-gray-300 dark:bg-gray-600 rounded" />
                <div class="h-3 w-24 bg-gray-300 dark:bg-gray-600 rounded" />
              </div>
            </div>
            <div class="space-y-2">
              <div class="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full" />
              <div class="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4" />
            </div>
          </div>
        </template>

        <template #error>
          <div class="max-w-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-600 dark:text-red-400">
            Failed to load tweet
          </div>
        </template>
      </ScriptXEmbed>
    </div>
  </div>
</template>
