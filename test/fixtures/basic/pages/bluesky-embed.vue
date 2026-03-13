<script setup lang="ts">
const postUrl = 'https://bsky.app/profile/jacobandrewsky.bsky.social/post/3llqqioqpuk2y'
</script>

<template>
  <div>
    <h1>Bluesky Embed Test</h1>
    <ScriptBlueskyEmbed :post-url="postUrl">
      <template #default="{ displayName, handle, text, likesFormatted, repliesFormatted, repostsFormatted, postUrl: url, images, avatar }">
        <div id="bluesky-content">
          <p id="display-name">
            {{ displayName }}
          </p>
          <p id="handle">
            {{ handle }}
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
          <p id="reposts">
            {{ repostsFormatted }}
          </p>
          <a id="post-url" :href="url">View post</a>
          <img id="avatar" :src="avatar">
          <div v-if="images?.length" id="images">
            <img v-for="(img, i) in images" :key="i" :src="img.fullsize" :alt="img.alt">
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
          {{ error?.message || 'Error loading post' }}
        </div>
      </template>
    </ScriptBlueskyEmbed>
  </div>
</template>
