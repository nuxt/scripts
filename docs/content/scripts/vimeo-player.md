---
title: Vimeo Player
description: Show performance-optimized Vimeo videos in your Nuxt app.
links:
  - label: useScriptVimeoPlayer
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/vimeo-player.ts
    size: xs
  - label: "<ScriptVimeoPlayer>"
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/components/ScriptVimeoPlayer.vue
    size: xs
---

[Vimeo](https://vimeo.com/) hosts videos and provides a JavaScript player API.

Nuxt Scripts provides a [`useScriptVimeoPlayer()`{lang="ts"}](/scripts/vimeo-player){lang="ts"} composable and a headless [`<ScriptVimeoPlayer>`{lang="html"}](/scripts/vimeo-player){lang="html"} component for interacting with the Vimeo Player.

::script-stats
::

::script-docs
::

## Types

Install `@vimeo/player`, which includes its own types, for full TypeScript support.

```bash
pnpm add -D @vimeo/player
```

## [`<ScriptVimeoPlayer>`{lang="html"}](/scripts/vimeo-player){lang="html"}

[`<ScriptVimeoPlayer>`{lang="html"}](/scripts/vimeo-player){lang="html"} wraps [`useScriptVimeoPlayer()`{lang="ts"}](/scripts/vimeo-player){lang="ts"} with a lazy placeholder and headless player UI.

An [Element Event Trigger](/docs/guides/script-triggers#element-event-triggers) delays the Vimeo player until the configured event fires.

The default event is `mousedown`.

::callout{color="amber"}
The player accepts either `id` or `url`, but the current oEmbed thumbnail request reads only `id`. When you pass only `url`, provide your own `#placeholder` content or also pass the numeric video ID.
::

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
      <UAlert v-if="!isLoaded" class="mb-5" size="sm" color="blue" variant="soft" title="Click the video!" description="Clicking the video will load the Vimeo iframe and start the video." />
      <UButton v-if="isLoaded && !isPlaying" @click="play">
        Play Video
      </UButton>
    </div>
  </div>
</template>
```

::

#### Eager Loading Placeholder

The Vimeo video placeholder is lazy-loaded by default. For an above-the-fold video, load the image eagerly or replace it through the `#placeholder` slot.

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

The component forwards the Vimeo Player SDK events below. See [Player Events](https://developer.vimeo.com/player/sdk/reference#about-player-events) for payload details. A failure while loading the SDK also emits `error`, but without the event and player arguments declared for Vimeo's own `error` event.

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

Use the slots to control the facade around the player.

**default**

Always visible.

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

Shown while the component waits for its element trigger.

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

Shown while the Vimeo SDK loads.

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

Replaces the default Vimeo thumbnail. The slot receives the resolved `placeholder` URL.

```vue
<template>
  <ScriptVimeoPlayer :id="331567154">
    <template #placeholder="{ placeholder }">
      <img :src="placeholder" alt="Video Placeholder">
    </template>
  </ScriptVimeoPlayer>
</template>
```

## [`useScriptVimeoPlayer()`{lang="ts"}](/scripts/vimeo-player){lang="ts"}

Use [`useScriptVimeoPlayer()`{lang="ts"}](/scripts/vimeo-player){lang="ts"} when you need to load the Vimeo Player SDK and create a player programmatically.

```ts
export function useScriptVimeoPlayer<T extends VimeoPlayerApi>(_options?: VimeoPlayerInput) {}
```

For triggers, proxying, and other script options, see [Registry Scripts](/docs/guides/registry-scripts).

::script-types
::

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

function play() {
  player?.play()
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
