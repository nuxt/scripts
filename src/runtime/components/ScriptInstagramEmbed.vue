<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { computed } from 'vue'
import { useAsyncData } from 'nuxt/app'
import { extractInstagramShortcode } from '../registry/instagram-embed'

const props = withDefaults(defineProps<{
  /**
   * The Instagram post URL to embed
   * e.g., https://www.instagram.com/p/ABC123/
   */
  postUrl: string
  /**
   * Whether to include captions in the embed
   * @default true
   */
  captions?: boolean
  /**
   * Custom API endpoint for fetching embed HTML
   * @default '/api/_scripts/instagram-embed'
   */
  apiEndpoint?: string
  /**
   * Root element attributes
   */
  rootAttrs?: HTMLAttributes
}>(), {
  captions: true,
  apiEndpoint: '/api/_scripts/instagram-embed',
})

const shortcode = computed(() => extractInstagramShortcode(props.postUrl))

const { data: html, status, error } = useAsyncData<string>(
  `instagram-embed-${props.postUrl}`,
  () => $fetch(`${props.apiEndpoint}?url=${encodeURIComponent(props.postUrl)}&captions=${props.captions}`),
  { watch: [() => props.postUrl, () => props.captions] },
)

defineExpose({
  html,
  status,
  error,
  shortcode,
})
</script>

<template>
  <div v-bind="rootAttrs">
    <slot v-if="status === 'pending'" name="loading">
      <div>Loading Instagram post...</div>
    </slot>
    <slot v-else-if="status === 'error'" name="error" :error="error">
      <div>Failed to load Instagram post</div>
    </slot>
    <slot v-else-if="html" :html="html" :shortcode="shortcode" :post-url="postUrl">
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div v-html="html" />
    </slot>
  </div>
</template>
