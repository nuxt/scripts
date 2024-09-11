---
title: YouTube Player
description: Show performance-optimized YouTube videos in your Nuxt app.
links:
  - label: useScriptYouTubePlayer
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/src/runtime/registry/youtube-player.ts
    size: xs
  - label: "<ScriptYouTubePlayer>"
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/src/runtime/components/ScriptYouTubePlayer.vue
    size: xs
---

[YouTube](https://youtube.com/) is a video hosting platform that allows you to upload and share videos.

Nuxt Scripts provides a `useScriptYouTubePlayer` composable and a headless `ScriptYouTubePlayer` component to interact with the YouTube Player.

## ScriptYouTubePlayer

The `ScriptYouTubePlayer` component is a wrapper around the `useScriptYouTubePlayer` composable. It provides a simple way to embed YouTube videos in your Nuxt app.

It's optimized for performance by leveraging the [Element Event Triggers](/docs/guides/script-triggers#element-event-triggers), only loading the YouTube Player when the specific elements events happen.

By default, it will load on the `mousedown` event.

### Demo

::code-group

:youtube-demo{label="Output"}

```vue [Input]
<script setup lang="ts">
const isLoaded = ref(false)
const isPlaying = ref(false)
const video = ref()
async function play() {
  await video.value.player.playVideo()
}
function stateChange(event) {
  isPlaying.value = event.data === 1
}
</script>

<template>
  <div>
    <div class="flex items-center justify-center p-5">
      <ScriptYouTubePlayer ref="video" video-id="d_IFKP1Ofq0" @ready="isLoaded = true" @state-change="stateChange">
        <template #awaitingLoad>
          <div class="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 h-[48px] w-[68px]">
            <svg height="100%" version="1.1" viewBox="0 0 68 48" width="100%"><path d="M66.52,7.74c-0.78-2.93-2.49-5.41-5.42-6.19C55.79,.13,34,0,34,0S12.21,.13,6.9,1.55 C3.97,2.33,2.27,4.81,1.48,7.74C0.06,13.05,0,24,0,24s0.06,10.95,1.48,16.26c0.78,2.93,2.49,5.41,5.42,6.19 C12.21,47.87,34,48,34,48s21.79-0.13,27.1-1.55c2.93-0.78,4.64-3.26,5.42-6.19C67.94,34.95,68,24,68,24S67.94,13.05,66.52,7.74z" fill="#f00" /><path d="M 45,24 27,14 27,34" fill="#fff" /></svg>
          </div>
        </template>
      </ScriptYouTubePlayer>
    </div>
    <div class="text-center">
      <UAlert v-if="!isLoaded" class="mb-5" size="sm" color="blue" variant="soft" title="Click to load" description="Clicking the video will load the Youtube iframe and start the video." />
      <UButton v-if="isLoaded && !isPlaying" @click="play">
        Play Video
      </UButton>
    </div>
  </div>
</template>
```

::

### Props

The `ScriptYouTubePlayer` component accepts the following props:

- `trigger`: The trigger event to load the YouTube Player. Default is `mousedown`. See [Element Event Triggers](/docs/guides/script-triggers#element-event-triggers) for more information.
- `placeholderAttrs`: The attributes for the placeholder image. Default is `{ loading: 'lazy' }`.
- `aboveTheFold`: Optimizes the placeholder image for above-the-fold content. Default is `false`.

All script options from the [YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference) are supported on the `playerVars` prop, please consult the [Supported paramters](https://developers.google.com/youtube/player_parameters#Parameters) for full documentation.

```ts
export interface YouTubeProps {
  // YouTube Player
  videoId: string
  playerVars?: YT.PlayerVars
  width?: number
  height?: number
}
```

#### Eager Loading Placeholder

The Vimeo Video placeholder image is lazy-loaded by default. You should change this behavior if your video is above the fold
or consider using the `#placeholder` slot to customize the placeholder image.

::code-group

```vue [Placeholder Attrs]
<ScriptYouTubePlayer above-the-fold />
```

```vue [Placeholder Slot]
<ScriptYouTubePlayer>
  <template #placeholder="{ placeholder }">
    <img :src="placeholder" alt="Video Placeholder">
  </template>
</ScriptYouTubePlayer>
```

::

### Component API

See the [Facade Component API](/docs/guides/facade-components#facade-components-api) for full props, events, and slots.

### Events

The `ScriptYouTubePlayer` component emits all events from the YouTube Player SDK. Please consult the [Player Events](https://developers.google.com/youtube/iframe_api_reference#Events) for full documentation.

```ts
const emits = defineEmits<{
  'ready': [e: YT.PlayerEvent]
  'state-change': [e: YT.OnStateChangeEvent, target: YT.Player]
  'playback-quality-change': [e: YT.OnPlaybackQualityChangeEvent, target: YT.Player]
  'playback-rate-change': [e: YT.OnPlaybackRateChangeEvent, target: YT.Player]
  'error': [e: YT.OnErrorEvent, target: YT.Player]
}>()
```

### Slots

As the component is provided headless, there are a number of slots for you to customize the player however you like before it's loaded in.

**default**

The default slot is used to display content that will always be visible.

```vue
<template>
  <ScriptYouTubePlayer video-id="d_IFKP1Ofq0">
    <div class="bg-blue-500 text-white p-5">
      Video by Nuxt
    </div>
  </ScriptYouTubePlayer>
</template>
```

**awaitingLoad**

The slot is used to display content while the video is loading.

```vue
<template>
  <ScriptYouTubePlayer video-id="d_IFKP1Ofq0">
    <template #awaitingLoad>
      <div class="bg-blue-500 text-white p-5">
        Click to play!
      </div>
    </template>
  </ScriptYouTubePlayer>
</template>
```

**loading**

The slot is used to display content while the video is loading.

```vue
<template>
  <ScriptYouTubePlayer video-id="d_IFKP1Ofq0">
    <template #loading>
      <div class="bg-blue-500 text-white p-5">
        Loading...
      </div>
    </template>
  </ScriptYouTubePlayer>
</template>
```

**placeholder**

The slot is used to display a placeholder image before the video is loaded. By default, this will show the
youtube thumbnail for the video. You can display it however you like.

```vue
<template>
  <ScriptYouTubePlayer video-id="d_IFKP1Ofq0">
    <template #placeholder="{ placeholder }">
      <img :src="placeholder" alt="Video Placeholder">
    </template>
  </ScriptYouTubePlayer>
</template>
```

## useScriptYouTubePlayer

The `useScriptYouTubePlayer` composable lets you have fine-grain control over the YouTube Player SDK. It provides a way to load the YouTube Player SDK and interact with it programmatically.

```ts
export function useScriptYouTubePlayer<T extends YouTubePlayerApi>(_options?: YouTubePlayerInput) {}
```

Please follow the [Registry Scripts](/docs/guides/registry-scripts) guide to learn more about advanced usage.

### YouTubePlayerApi

```ts
/// <reference types="youtube" />
export interface YouTubePlayerApi {
  YT: typeof YT
}
```

## Example

Loading the YouTube Player SDK and interacting with it programmatically.

```vue
<script setup lang="ts">
const video = ref()
const { onLoaded } = useScriptYouTubePlayer()

const player = ref(null)
onLoaded(async ({ YT }) => {
  // we need to wait for the internal YouTube APIs to be ready
  const YouTube = await YT
  await new Promise<void>((resolve) => {
    if (typeof YT.Player === 'undefined')
      YouTube.ready(resolve)
    else
      resolve()
  })
  // load the API
  player.value = new YT.Player(video.value, {
    videoId: 'd_IFKP1Ofq0'
  })
})
function play() {
  player.value?.playVideo()
}
</script>

<template>
  <div>
    <div ref="video" />
    <button @click="play">
      Play
    </button>
  </div>
</template>
```
