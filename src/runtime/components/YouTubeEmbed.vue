<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type YT from 'youtube'
import { useScriptYouTubeIframe } from '../registry/youtube-iframe'
import { type ElementScriptTrigger, useElementScriptTrigger } from '../composables/useComponentStateTrigger'

const props = withDefaults(defineProps<{
  trigger?: ElementScriptTrigger
  videoId: string
  playerVars?: YT.PlayerVars
  width?: number
  height?: number
}>(), {
  playerVars: { autoplay: 1, playsinline: 1 },
  width: 640,
  height: 480,
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
const elYoutube = ref()

const ready = ref(false)
const { $script } = useScriptYouTubeIframe({
  scriptOptions: {
    trigger: useElementScriptTrigger(props.trigger, elYoutube.value),
  },
})

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
    ...props,
    events: Object.fromEntries(events.map(event => [event, (e: any) => {
      // @ts-expect-error untyped
      emits(event, e)
    }])),
  })
})

defineExpose({
  player,
})

watch(() => props.videoId, () => {
  player?.loadVideoById(props.videoId)
})

const poster = computed(() => `https://i.ytimg.com/vi_webp/${props.videoId}/sddefault.webp`)
</script>

<template>
  <div ref="elYoutube" :style="{ width: `${width}px`, height: `${height}px`, position: 'relative' }">
    <slot :poster="poster">
      <img v-if="!ready" :src="poster" title="" :width="width" :height="height">
    </slot>
  </div>
</template>
