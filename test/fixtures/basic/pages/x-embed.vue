<script setup lang="ts">
const tweetId = '1754336034228171055'
</script>

<template>
  <div>
    <h1>X Embed Test</h1>
    <ScriptXEmbed :tweet-id="tweetId">
      <template #default="{ userName, userHandle, text, likesFormatted, repliesFormatted, tweetUrl, photos }">
        <div id="tweet-content">
          <p id="user-name">
            {{ userName }}
          </p>
          <p id="user-handle">
            {{ userHandle }}
          </p>
          <p id="text">
            {{ text }}
          </p>
          <p id="likes">
            {{ likesFormatted }}
          </p>
          <p id="replies">
            {{ repliesFormatted }}
          </p>
          <a id="tweet-url" :href="tweetUrl">View tweet</a>
          <div v-if="photos?.length" id="photos">
            <img v-for="(photo, i) in photos" :key="i" :src="photo.proxiedUrl" :data-original="photo.url">
          </div>
        </div>
      </template>

      <template #loading>
        <div id="loading">
          Loading...
        </div>
      </template>

      <template #error="{ error }">
        <div id="error">
          {{ error?.message || 'Error loading tweet' }}
        </div>
      </template>
    </ScriptXEmbed>
  </div>
</template>
