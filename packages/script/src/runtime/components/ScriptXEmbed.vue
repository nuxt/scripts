<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import type { XEmbedTweetData } from '../registry/x-embed'
import { useAsyncData } from 'nuxt/app'
import { computed } from 'vue'
import { useScriptProxyUrl } from '../composables/useScriptProxyUrl'
import { formatCount, formatTweetDate } from '../registry/x-embed'
import { requireRegistryEndpoint, scriptsPrefix } from '../utils'

const props = withDefaults(defineProps<{
  /**
   * The tweet ID to embed
   */
  tweetId: string
  /**
   * Custom API endpoint for fetching tweet data
   */
  apiEndpoint?: string
  /**
   * Custom image proxy endpoint
   */
  imageProxyEndpoint?: string
  /**
   * Root element attributes
   */
  rootAttrs?: HTMLAttributes
}>(), {
  apiEndpoint: undefined,
  imageProxyEndpoint: undefined,
})

defineSlots<{
  default?: (props: NonNullable<typeof slotProps.value>) => any
  loading?: () => any
  error?: (props: { error: typeof error.value }) => any
}>()

const prefix = scriptsPrefix()

const apiEndpoint = computed(() => props.apiEndpoint || `${prefix}/embed/x`)
const resolvedImageProxyEndpoint = computed((): string => props.imageProxyEndpoint || `${prefix}/embed/x-image`)
if (!props.apiEndpoint)
  requireRegistryEndpoint('ScriptXEmbed', 'xEmbed')

const proxyUrl = useScriptProxyUrl()

const cacheKey = computed(() => `x-embed-${props.tweetId}`)

const { data: tweet, status, error } = useAsyncData<XEmbedTweetData>(
  cacheKey,
  () => $fetch(proxyUrl(apiEndpoint.value, { id: props.tweetId })),
)

const slotProps = computed(() => {
  if (!tweet.value)
    return null

  const t = tweet.value
  // Image URLs arrive from `/embed/x` already pointed at the proxy endpoint.
  // When signing is enabled they include `&sig=...`; otherwise plain `?url=...`.
  return {
    // Raw data
    tweet: t,
    // User info
    userName: t.user.name,
    userHandle: t.user.screen_name,
    userAvatar: t.user.profile_image_url_https,
    isVerified: t.user.verified || t.user.is_blue_verified,
    // Tweet content
    text: t.text,
    // Formatted values
    datetime: formatTweetDate(t.created_at),
    createdAt: new Date(t.created_at),
    likes: t.favorite_count,
    likesFormatted: formatCount(t.favorite_count),
    replies: t.conversation_count,
    repliesFormatted: formatCount(t.conversation_count),
    // Media (already proxied)
    photos: t.photos?.map(p => ({
      ...p,
      proxiedUrl: p.url,
    })),
    video: t.video
      ? {
          ...t.video,
          posterProxied: t.video.poster,
        }
      : null,
    // Links
    tweetUrl: `https://x.com/${t.user.screen_name}/status/${t.id_str}`,
    userUrl: `https://x.com/${t.user.screen_name}`,
    // Quoted tweet
    quotedTweet: t.quoted_tweet,
    // Reply context
    isReply: !!t.parent,
    replyToUser: t.parent?.user.screen_name,
    // Helpers — proxy an arbitrary URL through the image endpoint at runtime.
    // Uses the page token emitted during SSR so client-generated URLs validate.
    proxyImage: (url: string) => proxyUrl(resolvedImageProxyEndpoint.value, { url }),
  }
})

defineExpose({
  tweet,
  status,
  error,
})
</script>

<template>
  <div v-bind="rootAttrs">
    <slot v-if="status === 'pending'" name="loading">
      <div>Loading tweet...</div>
    </slot>
    <slot v-else-if="status === 'error'" name="error" :error="error">
      <div>Failed to load tweet</div>
    </slot>
    <slot v-else-if="slotProps" v-bind="slotProps" />
  </div>
</template>
