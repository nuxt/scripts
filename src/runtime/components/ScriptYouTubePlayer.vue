<script setup lang="ts">
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

/// <reference types="youtube" />
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { HTMLAttributes, ImgHTMLAttributes, Ref } from 'vue'
import { defu } from 'defu'
import { useHead } from 'nuxt/app'
import type { ElementScriptTrigger } from '../types'
import { useScriptTriggerElement } from '../composables/useScriptTriggerElement'
import { useScriptYouTubePlayer } from '../registry/youtube-player'
import ScriptAriaLoadingIndicator from './ScriptAriaLoadingIndicator.vue'

export type YoutubeThumbnailSize
// 120x90
  = '1' | '2' | '3' | 'default'
  // 320x180
    | 'mq1' | 'mq2' | 'mq3' | 'mqdefault'
  // 480x360
    | '0' | 'hq1' | 'hq2' | 'hq3' | 'hqdefault'
  // 640x480
    | 'sd1' | 'sd2' | 'sd3' | 'sddefault'
  // 1280x720
    | 'hq720'
  // 1920x1080
    | 'maxresdefault'

const props = withDefaults(defineProps<{
  placeholderAttrs?: ImgHTMLAttributes
  rootAttrs?: HTMLAttributes
  aboveTheFold?: boolean
  trigger?: ElementScriptTrigger
  videoId: string
  playerVars?: YT.PlayerVars
  width?: number
  height?: number
  /**
   * Whether to use youtube-nocookie.com for embedding.
   *
   * @default false
   */
  cookies?: boolean
  playerOptions?: YT.PlayerOptions
  thumbnailSize?: YoutubeThumbnailSize
  webp?: boolean
  /**
   * Object-fit for the placeholder image.
   *
   * @default 'cover'
   */
  placeholderObjectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down'
}>(), {
  cookies: false,
  trigger: 'mousedown',
  thumbnailSize: 'hq720',
  webp: true,
  // @ts-expect-error untyped
  playerVars: { autoplay: 0, playsinline: 1 },
  width: 640,
  height: 360,
  placeholderObjectFit: 'cover',
})

const emits = defineEmits<{
  'ready': [e: YT.PlayerEvent]
  'state-change': [e: YT.OnStateChangeEvent, target: YT.Player]
  'playback-quality-change': [e: YT.OnPlaybackQualityChangeEvent, target: YT.Player]
  'playback-rate-change': [e: YT.OnPlaybackRateChangeEvent, target: YT.Player]
  'error': [e: YT.OnErrorEvent, target: YT.Player]
  'api-change': [e: YT.PlayerEvent, target: YT.Player]
}>()
const events: (keyof YT.Events)[] = [
  'onReady',
  'onStateChange',
  'onPlaybackQualityChange',
  'onPlaybackRateChange',
  'onError',
  'onApiChange',
]
const rootEl = ref()
const youtubeEl = ref()
const ready = ref(false)
// Track this instance's trigger state separately from the shared script load state
const isTriggered = ref(false)
const trigger = useScriptTriggerElement({ trigger: props.trigger, el: rootEl })

// Load script immediately (shared across all players), but track this player's trigger separately
const script = useScriptYouTubePlayer({
  scriptOptions: {
    // Use immediate trigger so script loads when ANY player needs it
    // Each player will wait for its own trigger before creating iframe
    trigger,
  },
})
const { onLoaded, status } = script

const player: Ref<YT.Player | undefined> = ref()
const clickTriggered = ref(false)

// Track when THIS player's trigger fires
if (trigger instanceof Promise) {
  trigger.then((triggered) => {
    if (triggered) {
      isTriggered.value = true
      if (props.trigger === 'mousedown') {
        clickTriggered.value = true
      }
    }
  })
}
else {
  // Immediate trigger
  isTriggered.value = true
}

// Watch for videoId changes (outside onLoaded to avoid creating multiple watchers)
const stopVideoIdWatch = watch(() => props.videoId, (newId) => {
  if (ready.value && player.value) {
    player.value.loadVideoById(newId)
  }
})

// Cleanup player on unmount
onBeforeUnmount(() => {
  stopVideoIdWatch()
  player.value?.destroy()
})

onMounted(() => {
  onLoaded(async (instance) => {
    // Wait for THIS player's trigger before creating iframe (fixes #339)
    if (!isTriggered.value && trigger instanceof Promise) {
      const triggered = await trigger
      if (!triggered) return // Component was disposed
    }

    // Guard against stale refs during layout transitions (fixes #297)
    if (!youtubeEl.value) return

    const YouTube = instance.YT instanceof Promise ? await instance.YT : instance.YT
    await new Promise<void>((resolve) => {
      if (typeof YT.Player === 'undefined')
        YouTube.ready(resolve)
      else
        resolve()
    })

    // Double-check ref is still valid after async operations
    if (!youtubeEl.value) return

    player.value = new YT.Player(youtubeEl.value, {
      host: !props.cookies ? 'https://www.youtube-nocookie.com' : 'https://www.youtube.com',
      videoId: props.videoId,
      width: props.width,
      height: props.height,
      playerVars: props.playerVars,
      ...props.playerOptions,
      events: Object.fromEntries(events.map(event => [event, (e: any) => {
        const emitEventName = event.replace(/([A-Z])/g, '-$1').replace('on-', '').toLowerCase()
        // @ts-expect-error untyped
        emits(emitEventName, e)
        if (event === 'onReady') {
          ready.value = true
          if (clickTriggered.value) {
            player.value?.playVideo()
            clickTriggered.value = false
          }
        }
      }])),
    })
  })
  watch(status, (status) => {
    if (status === 'error') {
      // @ts-expect-error untyped
      emits('error')
    }
  })
})

defineExpose({
  player,
})

const rootAttrs = computed(() => {
  return defu(props.rootAttrs, {
    'aria-busy': status.value === 'loading',
    'aria-label': status.value === 'awaitingLoad'
      ? 'YouTube Player - Placeholder'
      : status.value === 'loading'
        ? 'YouTube Player - Loading'
        : 'YouTube Player - Loaded',
    'aria-live': 'polite',
    'role': 'application',
    'style': {
      cursor: 'pointer',
      position: 'relative',
      backgroundColor: 'black',
      width: '100%',
      aspectRatio: `${props.width}/${props.height}`,
    },
    ...(trigger instanceof Promise ? trigger.ssrAttrs || {} : {}),
  }) as HTMLAttributes
})

const fallbackPlaceHolder = computed(() => `https://i.ytimg.com/vi/${props.videoId}/hqdefault.jpg`)
const placeholder = computed(() => `https://i.ytimg.com/${props.webp ? 'vi_webp' : 'vi'}/${props.videoId}/${props.thumbnailSize}.${props.webp ? 'webp' : 'jpg'}`)
const isFallbackPlaceHolder = ref(false)

if (import.meta.server) {
  useHead({
    link: [
      {
        key: 'nuxt-script-youtube-img-preconnect',
        rel: props.aboveTheFold ? 'preconnect' : 'dns-prefetch',
        href: 'https://i.ytimg.com',
      },
      props.aboveTheFold
        ? {
            key: `nuxt-script-youtube-img-preload-${props.videoId}`,
            rel: 'preload',
            as: 'image',
            href: placeholder.value,
          }
        : {},
    ],
  })
}

const placeholderAttrs = computed(() => {
  return defu(props.placeholderAttrs, {
    src: isFallbackPlaceHolder.value ? fallbackPlaceHolder.value : placeholder.value,
    alt: '',
    loading: props.aboveTheFold ? 'eager' : 'lazy',
    style: {
      width: '100%',
      objectFit: props.placeholderObjectFit,
      height: '100%',
    },
    onLoad(payload) {
      const img = payload.target as HTMLImageElement
      if (img.naturalWidth === 120 && img.naturalHeight === 90) {
        isFallbackPlaceHolder.value = true
      }
    },
  } satisfies ImgHTMLAttributes)
})
</script>

<template>
  <div ref="rootEl" v-bind="rootAttrs">
    <div ref="youtubeEl" style="width: 100%; height: 100%; position: absolute; top: 0; left: 0;" />
    <slot v-if="!ready" :placeholder="placeholder" name="placeholder">
      <img v-bind="placeholderAttrs">
    </slot>
    <slot v-if="status === 'loading'" name="loading">
      <ScriptAriaLoadingIndicator />
    </slot>
    <slot v-if="status === 'awaitingLoad'" name="awaitingLoad" />
    <slot v-else-if="status === 'error'" name="error" />
    <slot />
  </div>
</template>
