<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type YT from '@types/youtube'
import { useScriptYouTubeIframe } from '../registry/youtube-iframe'

const props = defineProps({
  videoId: { type: String, required: true },
  // 4:3
  width: { type: Number, default: 640 },
  height: { type: Number, default: 480 },
})

const emits = defineEmits<{
  onReady: [e: YT.PlayerEvent]
  onStateChange: [e: YT.PlayerEvent]
  onPlaybackQualityChange: [e: YT.PlayerEvent]
  onPlaybackRateChange: [e: YT.PlayerEvent]
  onError: [e: YT.PlayerEvent]
  onApiChange: [e: YT.PlayerEvent]
}>()

const events: (keyof YT.Events)[] = [
  'onReady',
  'onStateChange',
  'onPlaybackQualityChange',
  'onPlaybackRateChange',
  'onError',
  'onApiChange',
]

const wasHovered = ref(false)
const hoverPromise = new Promise<void>((resolve) => {
  watch(wasHovered, val => val && resolve())
})

const ready = ref(false)
const { $script } = useScriptYouTubeIframe({
  scriptOptions: {
    trigger: hoverPromise,
  },
})

const elYoutube = ref()

let player: YT.Player
$script.then(async (instance) => {
  const YT = await instance.YT
  await new Promise<void>((resolve) => {
    if (typeof YT.Player === 'undefined')
      YT.ready(resolve)
    else
      resolve()
  })
  player = new YT.Player(elYoutube.value, {
    width: '100%',
    videoId: props.videoId,
    playerVars: { autoplay: 1, playsinline: 1 },
    events: Object.fromEntries(events.map(event => [event, (e: any) => {
      // @ts-expect-error untyped
      emits(event, e)
    }])),
  })
})

watch(() => props.videoId, () => {
  player?.loadVideoById(props.videoId)
})

const poster = computed(() => `https://i.ytimg.com/vi_webp/${props.videoId}/sddefault.webp`)
</script>

<template>
  <div ref="elYoutube" :style="{ width: `${width}px`, height: `${height}px`, position: 'relative' }" @mouseover="wasHovered = true">
    <slot :poster="poster">
      <img v-if="!ready" :src="poster" title="" :width="width" :height="height">
    </slot>
  </div>
</template>
