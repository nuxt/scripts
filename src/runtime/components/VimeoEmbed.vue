<template>
  <div ref="root" :id="id">
    <slot />
  </div>
</template>

<script lang="ts" setup>
import { useIntersectionObserver } from "@vueuse/core";
import { ref, onBeforeUnmount, useId, useScriptVimeo } from "#imports";

const props = withDefaults(
  defineProps<{
    videoId: string;
    lazy?: boolean;
    rootMargin?: string;
    width?: string | number;
    height?: string | number;
    options?: Object;
    loop?: boolean;
    autoplay?: boolean;
    controls?: boolean;
  }>(),
  {
    lazy: true,
    rootMargin: "50px 50px 50px 50px",
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
const events: string[] = [
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
const id = _id.replace("-", "").replace("_", "");

const status: Ref<string | null> = ref(null);

const root = ref(null);

const { Player, $script } = useScriptVimeo({
  trigger: props.lazy ? "manual" : undefined,
});

let player: any;

if (!props.lazy) $script.then(init);
else {
  const { stop: stopIntersectionObserver } = useIntersectionObserver(
    root,
    ([{ isIntersecting }]) => {
      if (isIntersecting && !$script.loaded) {
        $script.load().then(() => {
          init();
          stopIntersectionObserver();
        });
      }
    },
    { rootMargin: props.rootMargin }
  );
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

  for (const event of events) {
    player?.on(event, (e: any) => {
      emit(event as keyof typeof emit, e, player);
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
