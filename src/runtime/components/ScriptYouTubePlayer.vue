<script setup lang="ts">
/// <reference types="youtube" />
import { computed, onMounted, ref, watch } from 'vue'
import type { HTMLAttributes, ImgHTMLAttributes, Ref } from 'vue'
import { defu } from 'defu'
import { useHead } from '@unhead/vue'
import type { ElementScriptTrigger } from '../types'
import { useScriptTriggerElement } from '../composables/useScriptTriggerElement'
import { useScriptYouTubePlayer } from '../registry/youtube-player'
import ScriptAriaLoadingIndicator from './ScriptAriaLoadingIndicator.vue'

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
}>(), {
  cookies: false,
  trigger: 'mousedown',
  // @ts-expect-error untyped
  playerVars: { autoplay: 0, playsinline: 1 },
  width: 640,
  height: 360,
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
const trigger = useScriptTriggerElement({ trigger: props.trigger, el: rootEl })
const script = useScriptYouTubePlayer({
  scriptOptions: {
    trigger,
  },
})
const { onLoaded, status } = script

const player: Ref<YT.Player | undefined> = ref()
let clickTriggered = false
if (props.trigger === 'mousedown' && trigger instanceof Promise) {
  trigger.then((triggered) => {
    if (triggered) {
      clickTriggered = true
    }
  })
}
onMounted(() => {
  onLoaded(async (instance) => {
    const YouTube = instance.YT instanceof Promise ? await instance.YT : instance.YT
    await new Promise<void>((resolve) => {
      if (typeof YT.Player === 'undefined')
        YouTube.ready(resolve)
      else
        resolve()
    })
    player.value = new YT.Player(youtubeEl.value, {
      host: !props.cookies ? 'https://www.youtube-nocookie.com' : 'https://www.youtube.com',
      ...props,
      ...props.playerOptions,
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
      maxWidth: '100%',
      width: `auto`,
      height: 'auto',
      aspectRatio: `${props.width}/${props.height}`,
    },
    ...(trigger instanceof Promise ? trigger.ssrAttrs || {} : {}),
  }) as HTMLAttributes
})

const placeholder = computed(() => `https://i.ytimg.com/vi_webp/${props.videoId}/sddefault.webp`)

if (import.meta.server) {
  // dns-prefetch https://i.vimeocdn.com
  useHead({
    link: [
      {
        key: `nuxt-script-youtube-img`,
        rel: props.aboveTheFold ? 'preconnect' : 'dns-prefetch',
        href: 'https://i.ytimg.com',
      },
      props.aboveTheFold
        // we can preload the placeholder image
        ? {
            key: `nuxt-script-youtube-img`,
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
      objectFit: 'cover',
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
    <slot v-if="status === 'loading'" name="loading">
      <ScriptAriaLoadingIndicator />
    </slot>
    <slot v-if="status === 'awaitingLoad'" name="awaitingLoad" />
    <slot v-else-if="status === 'error'" name="error" />
    <slot />
  </div>
</template>
