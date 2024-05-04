<script setup lang="ts">
/// <reference types="youtube" />
import { type Ref, computed, onMounted, ref, watch } from 'vue'
import type { ElementScriptTrigger } from '../composables/useElementScriptTrigger'
import { useElementScriptTrigger, useScriptYouTubeIframe } from '#imports'

const props = withDefaults(defineProps<{
  trigger?: ElementScriptTrigger
  videoId: string
  playerVars?: YT.PlayerVars
  width?: number
  height?: number
}>(), {
  // @ts-expect-error untyped
  trigger: ['mousemove', 'mousedown'],
  // @ts-expect-error untyped
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
const rootEl = ref()
const youtubeEl = ref()

const ready = ref(false)
const { $script } = useScriptYouTubeIframe({
  scriptOptions: {
    trigger: props.trigger ? useElementScriptTrigger({ trigger: props.trigger, el: rootEl }) : undefined,
  },
  bundle: true,
})

const player: Ref<YT.Player | undefined> = ref()
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
        // @ts-expect-error untyped
        emits(event, e)
        if (event === 'onReady') {
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

const poster = computed(() => `https://i.ytimg.com/vi_webp/${props.videoId}/sddefault.webp`)
</script>

<template>
  <div ref="rootEl" :style="{ width: `${width}px`, height: `${height}px`, position: 'relative' }">
    <div ref="youtubeEl" style="width: 100%; height: 100%; position: absolute; top: 0; left: 0;" />
    <slot v-if="!ready" name="poster" :poster="poster">
      <img v-if="!ready" :src="poster" title="" :width="width" :height="height">
    </slot>
    <slot v-if="$script.status.value === 'loading'" name="loading" />
    <slot v-if="$script.status.value === 'awaitingLoad'" name="awaitingLoad" />
  </div>
</template>
