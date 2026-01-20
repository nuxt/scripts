<script setup lang="ts">
import { computed } from 'vue'
import type { HTMLAttributes } from 'vue'
import { useAsyncData } from 'nuxt/app'
import type { XEmbedTweetData } from '../registry/x-embed'
import { formatCount, formatTweetDate, proxyXImageUrl } from '../registry/x-embed'

const props = withDefaults(defineProps<{
  /**
   * The tweet ID to embed
   */
  tweetId: string
  /**
   * Custom API endpoint for fetching tweet data
   * @default '/_scripts/x-embed'
   */
  apiEndpoint?: string
  /**
   * Custom image proxy endpoint
   * @default '/_scripts/x-embed-image'
   */
  imageProxyEndpoint?: string
  /**
   * Root element attributes
   */
  rootAttrs?: HTMLAttributes
}>(), {
  apiEndpoint: '/api/_scripts/x-embed',
  imageProxyEndpoint: '/api/_scripts/x-embed-image',
})

const { data: tweet, status, error } = useAsyncData<XEmbedTweetData>(
  `x-embed-${props.tweetId}`,
  () => $fetch(`${props.apiEndpoint}?id=${props.tweetId}`),
)

const slotProps = computed(() => {
  if (!tweet.value)
    return null

  const t = tweet.value
  return {
    // Raw data
    tweet: t,
    // User info
    userName: t.user.name,
    userHandle: t.user.screen_name,
    userAvatar: proxyXImageUrl(t.user.profile_image_url_https, props.imageProxyEndpoint),
    userAvatarOriginal: t.user.profile_image_url_https,
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
    // Media
    photos: t.photos?.map(p => ({
      ...p,
      proxiedUrl: proxyXImageUrl(p.url, props.imageProxyEndpoint),
    })),
    video: t.video
      ? {
          ...t.video,
          posterProxied: proxyXImageUrl(t.video.poster, props.imageProxyEndpoint),
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
    // Helpers
    proxyImage: (url: string) => proxyXImageUrl(url, props.imageProxyEndpoint),
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
