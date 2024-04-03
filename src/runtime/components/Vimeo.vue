<template>
  <div :id="id" class="vimeo" :class="{ isPlaying, isLoading, isLoaded }">
    <button class="vimeo__Play" @click="play" v-if="customPlay && isLoaded">
      <slot name="play"> Play </slot>
    </button>
  </div>
</template>

<script lang="ts" setup>
import {
  useHead,
  useId,
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  useScriptVimeo,
} from "#imports";

useHead({
  title: "Vimeo",
});

const props = withDefaults(
  defineProps<{
    id: string;
    customPlay?: boolean;
    width?: string | number;
    height?: string | number;
    options?: Object;
    loop?: boolean;
    autoplay?: boolean;
    controls?: boolean;
  }>(),
  {
    customPlay: true,
    width: "640",
    height: "360",
    options: () => ({}),
    loop: false,
    autoplay: false,
    controls: true,
  }
);

// TODO: put events in <script> - after build it doesn't work for some reason
// error: "both scripts must have same language type" even if they're both written in ts
const events: Array<string> = [
  "play",
  "playing",
  "pause",
  "ended",
  "timeupdate",
  "progress",
  "seeking",
  "seeked",
  "texttrackchange",
  "chapterchange",
  "cuechange",
  "cuepoint",
  "volumechange",
  "playbackratechange",
  "bufferstart",
  "bufferend",
  "error",
  "loaded",
  "durationchange",
  "fullscreenchange",
  "qualitychange",
  "camerachange",
  "resize",
];

const emit = defineEmits([
  "play",
  "playing",
  "pause",
  "ended",
  "timeupdate",
  "progress",
  "seeking",
  "seeked",
  "texttrackchange",
  "chapterchange",
  "cuechange",
  "cuepoint",
  "volumechange",
  "playbackratechange",
  "bufferstart",
  "bufferend",
  "error",
  "loaded",
  "durationchange",
  "fullscreenchange",
  "qualitychange",
  "camerachange",
  "resize",
]);

defineExpose({
  play,
  pause,
  mute,
  unmute,
});

const id = useId();
const status: Ref<string> = ref(null);

const { Player } = useScriptVimeo();
const isLoaded = ref(false);
let player;

onMounted(() => {
  const p = Player(id, {
    id: props.id,
    width: props.width,
    height: props.height,
    loop: props.loop,
    autoplay: props.autoplay,
    controls: props.controls,
    ...props.options,
  });

  if (p.then) {
    p.then((r: any) => {
      player = r;
      setListeners();
    });
  } else {
    player = p;
    setListeners();
  }
});

onBeforeUnmount(() => player?.unload());

const isPlaying = computed(() =>
  ["play", "playing", "timeupdate", "progress", "bufferend"].includes(
    status.value
  )
);
const isLoading = computed(() => status.value === "bufferstart");

function setListeners() {
  for (const event of events) {
    player?.on(event, () => {
      emit(event, event, player);
      status.value = event;

      if (event === "loaded") isLoaded.value = true;
    });
  }
}

function play() {
  player?.play();
}

function pause() {
  player?.pause();
}

function mute() {
  player?.setVolume(0);
}

function unmute(volume: number = 1) {
  player?.setVolume(volume);
}
</script>

<style>
.vimeo {
  position: relative;
  display: inline-block;
}

.vimeo.isPlaying .vimeo__Play {
  opacity: 0;
  visibility: hidden;
}

.vimeo__Play {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  transition: opacity 300ms, visibility 300ms;
}
</style>
