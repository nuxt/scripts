<script setup lang="ts">
const postUrl = 'https://www.instagram.com/p/C3Sk6d2MTjI/'
</script>

<template>
  <div>
    <h1>Instagram Embed Test</h1>
    <ScriptInstagramEmbed :post-url="postUrl" :captions="true">
      <template #default="{ html, shortcode }">
        <div id="instagram-content">
          <p id="shortcode">
            {{ shortcode }}
          </p>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div id="embed-html" v-html="html" />
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
    </ScriptInstagramEmbed>
  </div>
</template>
