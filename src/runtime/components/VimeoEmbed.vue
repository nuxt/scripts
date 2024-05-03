<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type Player from 'vimeo__player'
import type { EventMap, VimeoVideoQuality } from 'vimeo__player'
import type { ElementScriptTrigger } from '../composables/useElementScriptTrigger'
import { useAsyncData, useElementScriptTrigger, useScriptVimeoPlayer } from '#imports'

const props = withDefaults(defineProps<{
  // custom
  trigger?: ElementScriptTrigger
  // copied from @types/vimeo__player
  id: number | undefined
  url?: string | undefined
  autopause?: boolean | undefined
  autoplay?: boolean | undefined
  background?: boolean | undefined
  byline?: boolean | undefined
  color?: string | undefined
  controls?: boolean | undefined
  dnt?: boolean | undefined
  height?: number | undefined
  // eslint-disable-next-line vue/prop-name-casing
  interactive_params?: string | undefined
  keyboard?: boolean | undefined
  loop?: boolean | undefined
  maxheight?: number | undefined
  maxwidth?: number | undefined
  muted?: boolean | undefined
  pip?: boolean | undefined
  playsinline?: boolean | undefined
  portrait?: boolean | undefined
  responsive?: boolean | undefined
  speed?: boolean | undefined
  quality?: VimeoVideoQuality | undefined
  texttrack?: string | undefined
  title?: boolean | undefined
  transparent?: boolean | undefined
  width?: number | undefined
}>(), {
  trigger: 'mouseover',
  width: 640,
  height: 480,
  loop: false,
  controls: true,
})

const emits = defineEmits<{
  play: [e: EventMap['play'], player: Player]
  playing: [e: EventMap['playing'], player: Player]
  pause: [e: EventMap['pause'], player: Player]
  ended: [e: EventMap['ended'], player: Player]
  timeupdate: [e: EventMap['timeupdate'], player: Player]
  progress: [e: EventMap['progress'], player: Player]
  seeking: [e: EventMap['seeking'], player: Player]
  seeked: [e: EventMap['seeked'], player: Player]
  texttrackchange: [e: EventMap['texttrackchange'], player: Player]
  chapterchange: [e: EventMap['chapterchange'], player: Player]
  cuechange: [e: EventMap['cuechange'], player: Player]
  cuepoint: [e: EventMap['cuepoint'], player: Player]
  volumechange: [e: EventMap['volumechange'], player: Player]
  playbackratechange: [e: EventMap['playbackratechange'], player: Player]
  bufferstart: [e: EventMap['bufferstart'], player: Player]
  bufferend: [e: EventMap['bufferend'], player: Player]
  error: [e: EventMap['error'], player: Player]
  loaded: [e: EventMap['loaded'], player: Player]
  durationchange: [e: EventMap['durationchange'], player: Player]
  fullscreenchange: [e: EventMap['fullscreenchange'], player: Player]
  qualitychange: [e: EventMap['qualitychange'], player: Player]
  camerachange: [e: EventMap['camerachange'], player: Player]
  resize: [e: EventMap['resize'], player: Player]
  enterpictureinpicture: [e: EventMap['enterpictureinpicture'], player: Player]
  leavepictureinpicture: [e: EventMap['leavepictureinpicture'], player: Player]
}>()

const events = [
  'play',
  'playing',
  'pause',
  'ended',
  'timeupdate',
  'progress',
  'seeking',
  'seeked',
  'texttrackchange',
  'chapterchange',
  'cuechange',
  'cuepoint',
  'volumechange',
  'playbackratechange',
  'bufferstart',
  'bufferend',
  'error',
  'loaded',
  'durationchange',
  'fullscreenchange',
  'qualitychange',
  'camerachange',
  'resize',
]

const elVimeo = ref()
const root = ref()

const ready = ref(false)
const { $script } = useScriptVimeoPlayer({
  scriptOptions: {
    trigger: props.trigger ? useElementScriptTrigger({ trigger: props.trigger, el: root }) : undefined,
  },
})

const { data: payload } = useAsyncData(
  `vimeo-embed:${props.id}`,
  // TODO ideally we cache this
  () => $fetch(`https://vimeo.com/api/v2/video/${props.id}.json`).then(res => res[0]),
  {
    watch: [() => props.id],
  },
)

const poster = computed(() => {
  // 2 dpi for retina, this is safest while SSR
  return payload.value?.thumbnail_large // .replace(/-d_[\dx]+$/i, `-d_${Math.round(width * 2)}x${Math.round(height * 2)}`)
})

let player: Player
onMounted(() => {
  $script.then(({ Vimeo }) => {
    // filter props for false values
    player = new Vimeo.Player(elVimeo.value, {
      ...props,
      url: encodeURI(`https://vimeo.com/${props.id}`),
    })

    events.forEach((event) => {
      player.on(event, (e: any) => {
        emits(event as keyof typeof emits, e, player)
        if (event === 'loaded')
          ready.value = true
      })
    })
  })

  watch(() => props.id, (v) => {
    v && player?.loadVideo(v)
  })
})

onBeforeUnmount(() => player?.unload())

defineExpose({
  player,
})
</script>

<template>
  <div ref="root" :style="{ width: `${width}px`, height: `${height}px`, position: 'relative' }">
    <div v-show="ready" ref="elVimeo" style="width: 100%; height: 100%;" />
    <slot v-bind="payload" :poster="poster" name="poster">
      <div v-if="!ready" v-bind="trigger ? { loading: 'lazy' } : {}" :style="{ backgroundImage: `url(${poster})`, width: `${width}px`, height: `${height}px`, cursor: 'wait', backgroundRepeat: 'no-repeat', backgroundPosition: '50% 50%', backgroundColor: 'black' }" />
    </slot>
    <slot />
  </div>
</template>
