---
title: YouTube Player
description: Show performance-optimized YouTube videos in your Nuxt app.
links:
  - label: useScriptYouTubePlayer
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/youtube-player.ts
    size: xs
  - label: "<ScriptYouTubePlayer>"
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/components/ScriptYouTubePlayer.vue
    size: xs
---

[YouTube](https://youtube.com/) hosts videos and provides an iframe player API.

Nuxt Scripts provides a [`useScriptYouTubePlayer()`{lang="ts"}](/scripts/youtube-player){lang="ts"} composable and a headless [`<ScriptYouTubePlayer>`{lang="html"}](/scripts/youtube-player){lang="html"} component for controlling the YouTube player.

::script-stats
::

::script-docs
::

## Types

Install `@types/youtube` for full TypeScript support.

```bash
pnpm add -D @types/youtube
```

## [`<ScriptYouTubePlayer>`{lang="html"}](/scripts/youtube-player){lang="html"}

[`<ScriptYouTubePlayer>`{lang="html"}](/scripts/youtube-player){lang="html"} wraps [`useScriptYouTubePlayer()`{lang="ts"}](/scripts/youtube-player){lang="ts"} with a lazy thumbnail and a headless player UI.

An [Element Event Trigger](/docs/guides/script-triggers#element-event-triggers) delays the iframe API and player until the configured event fires.

The default event is `mousedown`.

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
      <UAlert v-if="!isLoaded" class="mb-5" size="sm" color="blue" variant="soft" title="Click to load" description="Clicking the video will load the YouTube iframe and start the video." />
      <UButton v-if="isLoaded && !isPlaying" @click="play">
        Play Video
      </UButton>
    </div>
  </div>
</template>
```

::

### Privacy

The `<ScriptYouTubePlayer>`{lang="html"} component uses YouTube's privacy-enhanced `https://www.youtube-nocookie.com` host by default. See YouTube's [embed instructions](https://support.google.com/youtube/answer/171780) for details.

To use the standard cookie-enabled host, set the `cookies` prop.

```vue
<ScriptYouTubePlayer video-id="d_IFKP1Ofq0" cookies />
```

### Placeholder

The YouTube Player placeholder is a 1280x720 WebP image that is lazy-loaded by default.

Set `thumbnailSize` to change the placeholder size. Set `webp` to `false` for a JPEG thumbnail.

```vue
<ScriptYouTubePlayer video-id="d_IFKP1Ofq0" thumbnail-size="maxresdefault" />
```

For finer control, set `placeholderAttrs` or replace the image through the `#placeholder` slot.

#### Eager Loading

For an above-the-fold video, load the thumbnail eagerly or replace it through the `#placeholder` slot.

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

The component forwards the six events below. At runtime, each handler receives only the event object shown here. A failure while loading the iframe API also emits `error` with no arguments. The component's current TypeScript declaration lists a second `YT.Player` argument for five events, but that argument is not emitted. The YouTube API defines `onAutoplayBlocked` too, but the component does not currently forward it. See [Player Events](https://developers.google.com/youtube/iframe_api_reference#Events) for payload details.

```ts
const emits = defineEmits<{
  'ready': [e: YT.PlayerEvent]
  'state-change': [e: YT.OnStateChangeEvent]
  'playback-quality-change': [e: YT.OnPlaybackQualityChangeEvent]
  'playback-rate-change': [e: YT.OnPlaybackRateChangeEvent]
  'error': [e: YT.OnErrorEvent]
  'api-change': [e: YT.PlayerEvent]
}>()
```

### Slots

Use the slots to control the facade around the player.

**default**

Always visible.

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

Shown while the component waits for its element trigger.

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

Shown while the iframe API loads.

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

Replaces the default YouTube thumbnail. The slot receives the computed `placeholder` URL.

```vue
<template>
  <ScriptYouTubePlayer video-id="d_IFKP1Ofq0">
    <template #placeholder="{ placeholder }">
      <img :src="placeholder" alt="Video Placeholder">
    </template>
  </ScriptYouTubePlayer>
</template>
```

## [`useScriptYouTubePlayer()`{lang="ts"}](/scripts/youtube-player){lang="ts"}

Use [`useScriptYouTubePlayer()`{lang="ts"}](/scripts/youtube-player){lang="ts"} when you need to load the iframe API and create a player programmatically.

```ts
export function useScriptYouTubePlayer<T extends YouTubePlayerApi>(_options: YouTubePlayerInput) {}
```

For triggers, proxying, and other script options, see [Registry Scripts](/docs/guides/registry-scripts).

::script-types
::

## Example

Loading the YouTube Player SDK and interacting with it programmatically.

```vue
<script setup lang="ts">
const video = ref()
const { onLoaded } = useScriptYouTubePlayer({})

const player = ref(null)
onLoaded(async ({ YT }) => {
  // we need to wait for the internal YouTube APIs to be ready
  const YouTube = await YT
  await new Promise<void>((resolve) => {
    if (typeof YouTube.Player === 'undefined')
      YouTube.ready(resolve)
    else
      resolve()
  })
  // load the API
  player.value = new YouTube.Player(video.value, {
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
