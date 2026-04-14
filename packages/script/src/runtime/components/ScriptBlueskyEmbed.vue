<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import type { BlueskyEmbedPostData } from '../registry/bluesky-embed'
import { useAsyncData } from 'nuxt/app'
import { computed } from 'vue'
import { extractBlueskyPostId, facetsToHtml, formatBlueskyDate, formatCount, proxyBlueskyImageUrl } from '../registry/bluesky-embed'
import { requireRegistryEndpoint, scriptsPrefix } from '../utils'

const props = withDefaults(defineProps<{
  /**
   * The Bluesky post URL to embed
   * @example 'https://bsky.app/profile/bsky.app/post/3mgnwwvj3u22a'
   */
  postUrl: string
  /**
   * Custom API endpoint for fetching post data
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

const resolvedApiEndpoint = computed((): string => props.apiEndpoint || `${prefix}/embed/bluesky`)
const resolvedImageProxyEndpoint = computed((): string => props.imageProxyEndpoint || `${prefix}/embed/bluesky-image`)
if (!props.apiEndpoint)
  requireRegistryEndpoint('ScriptBlueskyEmbed', 'blueskyEmbed')

const postId = computed(() => extractBlueskyPostId(props.postUrl))
const cacheKey = computed(() => `bluesky-embed-${postId.value?.actor}-${postId.value?.rkey}`)

const { data: post, status, error } = useAsyncData<BlueskyEmbedPostData>(
  cacheKey,
  () => $fetch(`${resolvedApiEndpoint.value}?url=${encodeURIComponent(props.postUrl)}`),
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
    avatar: proxyBlueskyImageUrl(p.author.avatar, resolvedImageProxyEndpoint.value),
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
      thumb: proxyBlueskyImageUrl(img.thumb, resolvedImageProxyEndpoint.value),
      fullsize: proxyBlueskyImageUrl(img.fullsize, resolvedImageProxyEndpoint.value),
      alt: img.alt,
      aspectRatio: img.aspectRatio,
    })),
    externalEmbed: p.embed?.external
      ? {
          uri: p.embed.external.uri,
          title: p.embed.external.title,
          description: p.embed.external.description,
          thumb: p.embed.external.thumb
            ? proxyBlueskyImageUrl(p.embed.external.thumb, resolvedImageProxyEndpoint.value)
            : undefined,
        }
      : undefined,
    // Links
    postUrl: props.postUrl,
    authorUrl: `https://bsky.app/profile/${p.author.handle}`,
    // Helpers
    proxyImage: (url: string) => proxyBlueskyImageUrl(url, resolvedImageProxyEndpoint.value),
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
