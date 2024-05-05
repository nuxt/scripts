<script setup lang="ts">
import { type HTMLAttributes, type ImgHTMLAttributes, computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type Player from 'vimeo__player'
import type { EventMap, VimeoVideoQuality } from 'vimeo__player'
import { defu } from 'defu'
import type { ElementScriptTrigger } from '../composables/useElementScriptTrigger'
import { useAsyncData, useElementScriptTrigger, useScriptVimeoPlayer } from '#imports'

const props = withDefaults(defineProps<{
  // custom
  trigger?: ElementScriptTrigger
  placeholderAttrs?: ImgHTMLAttributes
  // copied from @types/vimeo__player
  id: string | number | undefined
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
  trigger: 'mousedown',
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
const rootEl = ref()

const trigger = useElementScriptTrigger({ trigger: props.trigger, el: rootEl })
let clickTriggered = false
if (props.trigger === 'mousedown') {
  trigger.then(() => {
    clickTriggered = true
  })
}
const ready = ref(false)
const { $script } = useScriptVimeoPlayer({
  scriptOptions: {
    trigger,
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

const placeholder = computed(() => {
  return payload.value?.thumbnail_large
})

let player: Player | undefined
// we can't directly expose the player as vue will break the proxy
defineExpose({
  play: () => player?.play(),
  pause: () => player?.pause(),
  getDuration: () => player?.getDuration(),
  getCurrentTime: () => player?.getCurrentTime(),
  setCurrentTime: (time: number) => player?.setCurrentTime(time),
  getVolume: () => player?.getVolume(),
  setVolume: (volume: number) => player?.setVolume(volume),
  getPaused: () => player?.getPaused(),
  getEnded: () => player?.getEnded(),
  getLoop: () => player?.getLoop(),
  setLoop: (loop: boolean) => player?.setLoop(loop),
  getPlaybackRate: () => player?.getPlaybackRate(),
  setPlaybackRate: (rate: number) => player?.setPlaybackRate(rate),
})
onMounted(() => {
  $script.then(async ({ Vimeo }) => {
    // filter props for false values
    player = new Vimeo.Player(elVimeo.value, {
      ...props,
      url: encodeURI(`https://vimeo.com/${props.id}`),
    })
    if (clickTriggered) {
      player!.play()
      clickTriggered = false
    }
    for (const event of events) {
      player!.on(event, (e) => {
        emits(event, e, player)
        if (event === 'loaded')
          ready.value = true
      })
    }
  })

  watch(() => props.id, (v) => {
    v && player?.loadVideo(Number(v))
  })
})

const rootAttrs = computed(() => {
  return {
    'aria-busy': $script.status.value === 'loading',
    'aria-label': $script.status.value === 'awaitingLoad'
      ? 'Vimeo Player - Placeholder'
      : $script.status.value === 'loading'
        ? 'Vimeo Player - Loading'
        : 'Vimeo Player - Loaded',
    'aria-live': 'polite',
    'role': 'application',
    'style': {
      width: `${props.width}px`,
      height: `${props.height}px`,
      position: 'relative',
      backgroundColor: 'black',
    },
  } satisfies HTMLAttributes
})

const placeholderAttrs = computed(() => {
  return defu(props.placeholderAttrs, {
    src: placeholder.value,
    alt: '',
    loading: 'lazy',
    style: {
      cursor: 'pointer',
      width: '100%',
      objectFit: 'contain',
      height: '100%',
    },
  } satisfies ImgHTMLAttributes)
})

onBeforeUnmount(() => player?.unload())
</script>

<template>
  <div ref="rootEl" v-bind="rootAttrs">
    <div v-show="ready" ref="elVimeo" class="vimeo-player" style="width: 100%; height: 100%; max-width: 100%;" />
    <slot v-if="!ready" v-bind="payload" :placeholder="placeholder" name="placeholder">
      <img v-bind="placeholderAttrs">
    </slot>
    <slot v-if="$script.status.value === 'loading'" name="loading">
      <ScriptLoadingIndicator color="white" />
    </slot>
    <slot v-if="$script.status.value === 'awaitingLoad'" name="awaitingLoad" />
    <slot />
  </div>
</template>

<style>
.vimeo-player iframe {
  max-width: 100% !important;
}
</style>
