<script setup lang="ts">
/// <reference types="youtube" />
import { type HTMLAttributes, type ImgHTMLAttributes, type Ref, computed, onMounted, ref, watch } from 'vue'
import { defu } from 'defu'
import type { ElementScriptTrigger } from '../types'
import { useElementScriptTrigger, useHead, useScriptYouTubePlayer } from '#imports'

const props = withDefaults(defineProps<{
  placeholderAttrs?: ImgHTMLAttributes
  rootAttrs?: HTMLAttributes
  aboveTheFold?: boolean
  trigger?: ElementScriptTrigger
  videoId: string
  playerVars?: YT.PlayerVars
  width?: number
  height?: number
}>(), {
  trigger: 'mousedown',
  // @ts-expect-error untyped
  playerVars: { autoplay: 0, playsinline: 1 },
  width: 640,
  height: 480,
})

const emits = defineEmits<{
  'ready': [e: YT.PlayerEvent]
  'state-change': [e: YT.OnStateChangeEvent, target: YT.Player]
  'playback-quality-change': [e: YT.OnPlaybackQualityChangeEvent, target: YT.Player]
  'playback-rate-change': [e: YT.OnPlaybackRateChangeEvent, target: YT.Player]
  'error': [e: YT.OnErrorEvent, target: YT.Player]
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
const trigger = useElementScriptTrigger({ trigger: props.trigger, el: rootEl })
const { $script } = useScriptYouTubePlayer({
  scriptOptions: {
    trigger,
  },
})

const player: Ref<YT.Player | undefined> = ref()
let clickTriggered = false
if (props.trigger === 'mousedown') {
  trigger.then(() => {
    clickTriggered = true
  })
}
onMounted(() => {
  $script.then(async (instance) => {
    const YouTube: typeof YT & { ready: (fn: () => void) => void } = await instance.YT
    await new Promise<void>((resolve) => {
      if (typeof YT.Player === 'undefined')
        YouTube.ready(resolve)
      else
        resolve()
    })
    player.value = new YT.Player(youtubeEl.value, {
      ...props,
      events: Object.fromEntries(events.map(event => [event, (e: any) => {
        const emitEventName = event.replace(/([A-Z])/g, '-$1').replace('on-', '').toLowerCase()
        // @ts-expect-error untyped
        emits(emitEventName, e)
        if (event === 'onReady') {
          ready.value = true
          if (clickTriggered) {
            player.value?.playVideo()
            clickTriggered = false
          }
          watch(() => props.videoId, () => {
            player.value?.loadVideoById(props.videoId)
          })
        }
      }])),
    })
  })
})

defineExpose({
  player,
})

const rootAttrs = computed(() => {
  return defu(props.rootAttrs, {
    'aria-busy': $script.status.value === 'loading',
    'aria-label': $script.status.value === 'awaitingLoad'
      ? 'YouTube Player - Placeholder'
      : $script.status.value === 'loading'
        ? 'YouTube Player - Loading'
        : 'YouTube Player - Loaded',
    'aria-live': 'polite',
    'role': 'application',
    'style': {
      cursor: 'pointer',
      position: 'relative',
      backgroundColor: 'black',
      maxWidth: '100%',
      width: `${props.width}px`,
      height: `'auto'`,
      aspectRatio: `${props.width}/${props.height}`,
    },
  }) as HTMLAttributes
})

const placeholder = computed(() => `https://i.ytimg.com/vi_webp/${props.videoId}/sddefault.webp`)

if (import.meta.server) {
  // dns-prefetch https://i.vimeocdn.com
  useHead({
    link: [
      {
        rel: props.aboveTheFold ? 'preconnect' : 'dns-prefetch',
        href: 'https://i.ytimg.com',
      },
      props.aboveTheFold
        // we can preload the placeholder image
        ? {
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
    src: placeholder.value,
    alt: '',
    loading: props.aboveTheFold ? 'eager' : 'lazy',
    style: {
      width: '100%',
      objectFit: 'contain',
      height: '100%',
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
    <slot v-if="$script.status.value === 'loading'" name="loading">
      <ScriptLoadingIndicator />
    </slot>
    <slot v-if="$script.status.value === 'awaitingLoad'" name="awaitingLoad" />
  </div>
</template>
