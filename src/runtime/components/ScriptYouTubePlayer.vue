<script setup lang="ts">
/// <reference types="youtube" />
import { type Ref, computed, onMounted, ref, watch } from 'vue'
import type { ElementScriptTrigger } from '../composables/useElementScriptTrigger'
import { useElementScriptTrigger, useScriptYouTubePlayer } from '#imports'

const props = withDefaults(defineProps<{
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
  bundle: true,
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

const poster = computed(() => `https://i.ytimg.com/vi_webp/${props.videoId}/sddefault.webp`)
</script>

<template>
  <div ref="rootEl" :style="{ maxWidth: '100%', width: `${width}px`, height: `${height}px`, position: 'relative', cursor: 'pointer', backgroundColor: 'black' }">
    <div ref="youtubeEl" style="width: 100%; height: 100%; position: absolute; top: 0; left: 0;" />
    <slot v-if="!ready" :poster="poster" name="poster">
      <div :style="{ backgroundImage: `url(${poster})`, width: `100%`, height: `${height}px`, backgroundRepeat: 'no-repeat', backgroundPosition: '50% 50%', cursor: 'pointer', backgroundColor: 'black' }" />
    </slot>
    <slot v-if="$script.status.value === 'loading'" name="loading" />
    <slot v-if="$script.status.value === 'awaitingLoad'" name="awaitingLoad" />
  </div>
</template>
