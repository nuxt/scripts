<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { useAsyncData } from 'nuxt/app'
import { computed } from 'vue'
import { useScriptProxyUrl } from '../composables/useScriptProxyUrl'
import { extractInstagramShortcode } from '../registry/instagram-embed'
import { requireRegistryEndpoint, scriptsPrefix } from '../utils'

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
   */
  apiEndpoint?: string
  /**
   * Root element attributes
   */
  rootAttrs?: HTMLAttributes
}>(), {
  captions: true,
  apiEndpoint: undefined,
})

defineSlots<{
  default?: (props: { html: string, shortcode: string | undefined, postUrl: string }) => any
  loading?: () => any
  error?: (props: { error: typeof error.value }) => any
}>()

const prefix = scriptsPrefix()

const apiEndpoint = computed(() => props.apiEndpoint || `${prefix}/embed/instagram`)
if (!props.apiEndpoint)
  requireRegistryEndpoint('ScriptInstagramEmbed', 'instagramEmbed')

const proxyUrl = useScriptProxyUrl()
const shortcode = computed(() => extractInstagramShortcode(props.postUrl))

const { data: html, status, error } = useAsyncData<string>(
  `instagram-embed-${props.postUrl}`,
  () => $fetch(proxyUrl(apiEndpoint.value, { url: props.postUrl, captions: props.captions })),
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
