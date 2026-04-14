<script setup>
// Example Instagram post URLs
const postUrls = [
  'https://www.instagram.com/p/C3Sk6d2MTjI/',
]
</script>

<template>
  <div class="p-4 space-y-8">
    <h1 class="text-2xl font-bold">
      Instagram Embed
    </h1>

    <div v-for="postUrl in postUrls" :key="postUrl" class="max-w-lg">
      <ScriptInstagramEmbed
        :post-url="postUrl"
        :captions="true"
      >
        <template #loading>
          <div class="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 animate-pulse">
            <div class="aspect-square bg-gray-300 dark:bg-gray-600 rounded mb-4" />
            <div class="space-y-2">
              <div class="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full" />
              <div class="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4" />
            </div>
          </div>
        </template>

        <template #error>
          <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-600 dark:text-red-400">
            Failed to load Instagram post
          </div>
        </template>
      </ScriptInstagramEmbed>
    </div>
  </div>
</template>
