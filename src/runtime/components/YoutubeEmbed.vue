<script lang="ts" setup>
import { useScript } from '@unhead/vue'
import { ref, watch } from 'vue'
import { useHead } from '#imports'

defineProps({
  videoid: { type: String, required: true },
  playLabel: { type: String, required: true },
  width: { type: String, required: false, default: '100%' },
  height: { type: String, required: false, default: '100%' },
  params: { type: String, required: false, default: undefined },
})

useScript({
  src: 'https://cdn.jsdelivr.net/gh/paulirish/lite-youtube-embed@master/src/lite-yt-embed.js',
}, {
  beforeInit: () => useHead({
    link: [
      { rel: 'stylesheet', href: 'https://cdn.jsdelivr.net/gh/paulirish/lite-youtube-embed@master/src/lite-yt-embed.css' },
    ],
  }),
})

// expose function to access the video API
const video = ref<LiteYTEmbed | null>(null)
watch(() => video.value, (value) => {
  if (value)
    value.getYTPlayer()
})
// TODO expose API
</script>

<template>
  <lite-youtube ref="video" :videoid="videoid" :style="`background-image: url('https://i.ytimg.com/vi/${videoid}/hqdefault.jpg')`">
    <slot>
      <a :href="`https://youtube.com/watch?v=${videoid}`" class="lty-playbtn" title="Play Video">
        <span class="lyt-visually-hidden">Play Video</span>
      </a>
    </slot>
  </lite-youtube>
</template>
