<template>
  <div ref="root" :id="id">
    <slot />
  </div>
</template>

<script lang="ts" setup>
import { useIntersectionObserver } from "@vueuse/core";
import { ref, watch, onBeforeUnmount, useId, useScriptVimeo } from "#imports";

const props = withDefaults(
  defineProps<{
    videoId: string;
    lazy?: boolean;
    width?: string | number;
    height?: string | number;
    options?: Object;
    loop?: boolean;
    autoplay?: boolean;
    controls?: boolean;
  }>(),
  {
    lazy: true,
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

const _id = useId();
const id = _id.replace('-', '').replace('_', '');
const status: Ref<string> = ref(null);

const root = ref(null);

const { Player, $script } = useScriptVimeo({
  trigger: props.lazy ? "manual" : undefined,
});

let player;

if (!props.lazy) $script.then(init);
else {
  const { stop: stopIntersectionObserver } = useIntersectionObserver(
    root,
    ([{ isIntersecting }]) => {
      if(isIntersecting && !$script.loaded) {
        $script.load().then(() => {
          init()
          stopIntersectionObserver()
        });
      }
    },
  )
}

onBeforeUnmount(() => player?.unload());

function init() {
  player = Player(id, {
    id: props.videoId,
    width: props.width,
    height: props.height,
    loop: props.loop,
    autoplay: props.autoplay,
    controls: props.controls,
    ...props.options,
  });

  setListeners();
}

function setListeners() {
  for (const event of events) {
    player?.on(event, (e) => {
      emit(event, e, player);
      status.value = event;
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

defineExpose({
  play,
  pause,
  mute,
  unmute,
  status,
});
</script>
