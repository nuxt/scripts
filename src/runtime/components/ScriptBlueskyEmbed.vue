<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import type { BlueskyEmbedPostData } from '../registry/bluesky-embed'
import { useAsyncData } from 'nuxt/app'
import { computed } from 'vue'
import { extractBlueskyPostId, facetsToHtml, formatBlueskyDate, formatCount, proxyBlueskyImageUrl } from '../registry/bluesky-embed'
import { requireRegistryEndpoint } from '../utils'

const props = withDefaults(defineProps<{
  /**
   * The Bluesky post URL to embed
   * @example 'https://bsky.app/profile/bsky.app/post/3mgnwwvj3u22a'
   */
  postUrl: string
  /**
   * Custom API endpoint for fetching post data
   * @default '/_scripts/embed/bluesky'
   */
  apiEndpoint?: string
  /**
   * Custom image proxy endpoint
   * @default '/_scripts/embed/bluesky-image'
   */
  imageProxyEndpoint?: string
  /**
   * Root element attributes
   */
  rootAttrs?: HTMLAttributes
}>(), {
  apiEndpoint: '/_scripts/embed/bluesky',
  imageProxyEndpoint: '/_scripts/embed/bluesky-image',
})
if (!props.apiEndpoint || props.apiEndpoint === '/_scripts/embed/bluesky')
  requireRegistryEndpoint('ScriptBlueskyEmbed', 'blueskyEmbed')

const postId = computed(() => extractBlueskyPostId(props.postUrl))
const cacheKey = computed(() => `bluesky-embed-${postId.value?.actor}-${postId.value?.rkey}`)

const { data: post, status, error } = useAsyncData<BlueskyEmbedPostData>(
  cacheKey,
  () => $fetch(`${props.apiEndpoint}?url=${encodeURIComponent(props.postUrl)}`),
)

const slotProps = computed(() => {
  if (!post.value)
    return null

  const p = post.value
  return {
    // Raw data
    post: p,
    // Author info
    displayName: p.author.displayName,
    handle: p.author.handle,
    avatar: proxyBlueskyImageUrl(p.author.avatar, props.imageProxyEndpoint),
    avatarOriginal: p.author.avatar,
    isVerified: p.author.verification?.verifiedStatus === 'valid',
    // Post content
    text: p.record.text,
    richText: facetsToHtml(p.record.text, p.record.facets),
    langs: p.record.langs,
    // Formatted values
    datetime: formatBlueskyDate(p.record.createdAt),
    createdAt: new Date(p.record.createdAt),
    likes: p.likeCount,
    likesFormatted: formatCount(p.likeCount),
    reposts: p.repostCount,
    repostsFormatted: formatCount(p.repostCount),
    replies: p.replyCount,
    repliesFormatted: formatCount(p.replyCount),
    quotes: p.quoteCount,
    quotesFormatted: formatCount(p.quoteCount),
    // Media
    images: p.embed?.images?.map(img => ({
      thumb: proxyBlueskyImageUrl(img.thumb, props.imageProxyEndpoint),
      fullsize: proxyBlueskyImageUrl(img.fullsize, props.imageProxyEndpoint),
      alt: img.alt,
      aspectRatio: img.aspectRatio,
    })),
    externalEmbed: p.embed?.external
      ? {
          uri: p.embed.external.uri,
          title: p.embed.external.title,
          description: p.embed.external.description,
          thumb: p.embed.external.thumb
            ? proxyBlueskyImageUrl(p.embed.external.thumb, props.imageProxyEndpoint)
            : undefined,
        }
      : undefined,
    // Links
    postUrl: props.postUrl,
    authorUrl: `https://bsky.app/profile/${p.author.handle}`,
    // Helpers
    proxyImage: (url: string) => proxyBlueskyImageUrl(url, props.imageProxyEndpoint),
  }
})

defineExpose({
  post,
  status,
  error,
})
</script>

<template>
  <div v-bind="rootAttrs">
    <slot v-if="status === 'pending'" name="loading">
      <div>Loading Bluesky post...</div>
    </slot>
    <slot v-else-if="status === 'error'" name="error" :error="error">
      <div>Failed to load Bluesky post</div>
    </slot>
    <slot v-else-if="slotProps" v-bind="slotProps" />
  </div>
</template>
