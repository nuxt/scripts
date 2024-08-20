---
title: Vimeo Player
description: Show performance-optimized Vimeo videos in your Nuxt app.
links:
  - label: useScriptVimeoPlayer
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/src/runtime/registry/vimeo-player.ts
    size: xs
  - label: "<ScriptVimeoPlayer>"
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/src/runtime/components/ScriptVimeoPlayer.vue
    size: xs
---

[Vimeo](https://vimeo.com/) is a video hosting platform that allows you to upload and share videos.

Nuxt Scripts provides a `useScriptVimeoPlayer` composable and a headless `ScriptVimeoPlayer` a component to interact with the Vimeo Player.

## ScriptVimeoPlayer

The `ScriptVimeoPlayer` component is a wrapper around the `useScriptVimeoPlayer` composable. It provides a simple way to embed Vimeo videos in your Nuxt app.

It's optimized for performance by leveraging the [Element Event Triggers](/docs/guides/script-triggers#element-event-triggers), only loading the Vimeo Player when the specific elements events happen.

By default, it will load on the `mousedown` event.

### Demo

::code-group

:vimeo-demo{label="Output"}

```vue [Input]
<script setup lang="ts">
const isLoaded = ref(false)
const isPlaying = ref(false)
const video = ref()
async function play() {
  await video.value.play()
}
</script>

<template>
  <div>
    <div class="flex items-center justify-center p-5">
      <ScriptVimeoPlayer :id="331567154" ref="video" class="group" @loaded="isLoaded = true" @play="isPlaying = true" @pause="isPlaying = false">
        <template #awaitingLoad>
          <div class="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-500 group-hover:bg-blue-700 transition rounded px-6 py-2">
            <svg width="24" height="24" viewBox="0 0 24 24" class="w-10 h-10 text-white" xmlns="http://www.w3.org/2000/svg"><path d="M19 12C19 12.3557 18.8111 12.6846 18.5039 12.8638L6.50387 19.8638C6.19458 20.0442 5.81243 20.0455 5.50194 19.8671C5.19145 19.6888 5 19.3581 5 19L5 5C5 4.64193 5.19145 4.3112 5.50194 4.13286C5.81243 3.95452 6.19458 3.9558 6.50387 4.13622L18.5039 11.1362C18.8111 11.3154 19 11.6443 19 12Z" fill="currentColor" /></svg>
          </div>
        </template>
      </ScriptVimeoPlayer>
    </div>
    <div class="text-center">
      <UAlert v-if="!isLoaded" class="mb-5" size="sm" color="blue" variant="soft" title="Clicks the video!" description="Clicking the video will load the Vimeo iframe and start the video." />
      <UButton v-if="isLoaded && !isPlaying" @click="play">
        Play Video
      </UButton>
    </div>
  </div>
</template>
```

::

### Props

The `ScriptVimeoPlayer` component accepts the following props:

- `trigger`: The trigger event to load the Vimeo Player. Default is `mousedown`. See [Element Event Triggers](/docs/guides/script-triggers#element-event-triggers) for more information.
- `placeholderAttrs`: The attributes for the placeholder image. Default is `{ loading: 'lazy' }`.
- `aboveTheFold`: Optimizes the placeholder image for above-the-fold content. Default is `false`.

All script options from the Player SDK are supported, please consult the [Embed Options](https://developer.vimeo.com/player/sdk/embed)
for full documentation.

```ts
interface VimeoPlayerProps {
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
}
```

#### Eager Loading Placeholder

The Vimeo Video placeholder image is lazy-loaded by default. You should change this behavior if your video is above the fold
or consider using the `#placeholder` slot to customize the placeholder image.

::code-group

```vue [Placeholder Attrs]
<ScriptVimeoPlayer above-the-fold />
```

```vue [Placeholder Slot]
<ScriptVimeoPlayer>
  <template #placeholder="{ placeholder }">
    <img :src="placeholder" alt="Video Placeholder">
  </template>
</ScriptVimeoPlayer>
```

::

### Component API

See the [Facade Component API](/docs/guides/facade-components#facade-components-api) for full props, events, and slots.

### Events

The `ScriptVimeoPlayer` component emits all events from the Vimeo Player SDK. Please consult the [Player Events](https://developer.vimeo.com/player/sdk/reference#about-player-events) for full documentation.

```ts
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
```

### Slots

As the component is provided headless, there are a number of slots for you to customize the player however you like before it's loaded in.

**default**

The default slot is used to display content that will always be visible.

```vue
<template>
  <ScriptVimeoPlayer :id="331567154">
    <div class="bg-blue-500 text-white p-5">
      Video by NuxtJS
    </div>
  </ScriptVimeoPlayer>
</template>
```

**awaitingLoad**

The slot is used to display content while the video is loading.

```vue
<template>
  <ScriptVimeoPlayer :id="331567154">
    <template #awaitingLoad>
      <div class="bg-blue-500 text-white p-5">
        Click to play!
      </div>
    </template>
  </ScriptVimeoPlayer>
</template>
```

**loading**

The slot is used to display content while the video is loading.

```vue
<template>
  <ScriptVimeoPlayer :id="331567154">
    <template #loading>
      <div class="bg-blue-500 text-white p-5">
        Loading...
      </div>
    </template>
  </ScriptVimeoPlayer>
</template>
```

**placeholder**

The slot is used to display a placeholder image before the video is loaded. By default, this will show the
vimeo thumbnail for the video. You can display it however you like.

```vue
<template>
  <ScriptVimeoPlayer :id="331567154">
    <template #placeholder="{ placeholder }">
      <img :src="placeholder" alt="Video Placeholder">
    </template>
  </ScriptVimeoPlayer>
</template>
```

## useScriptVimeoPlayer

The `useScriptVimeoPlayer` composable lets you have fine-grain control over the Vimeo Player SDK. It provides a way to load the Vimeo Player SDK and interact with it programmatically.

```ts
export function useScriptVimeoPlayer<T extends VimeoPlayerApi>(_options?: VimeoPlayerInput) {}
```

Please follow the [Registry Scripts](/docs/guides/registry-scripts) guide to learn more about advanced usage.

### VimeoPlayerApi

```ts
export interface VimeoPlayerApi {
  Vimeo: {
    Player: ScriptVimeoPlayer
  }
}
```

## Example

Loading the Vimeo Player SDK and interacting with it programmatically.

```vue
<script setup lang="ts">
const video = ref()
const { onLoaded } = useScriptVimeoPlayer()

let player
onLoaded(({ Vimeo }) => {
  player = new Vimeo.Player(video.value, {
    id: 331567154
  })
})
</script>

<template>
  <div>
    <div ref="video" />
    <button @click="player.play()">
      Play
    </button>
  </div>
</template>
```
