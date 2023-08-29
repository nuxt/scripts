import { defineComponent, h } from 'vue'
import { useHead, useInlineAsset, useProxyAsset, useScript } from '#imports'

interface YoutubeEmbedOptions {
  videoid: string
  playlabel: string
}

export const YoutubeEmbed = defineComponent<YoutubeEmbedOptions>({
  name: 'YoutubeEmbed',
  setup(props) {
    useHead({
      style: [
        {
          // inlining will improve performance
          innerHTML: useInlineAsset('https://cdn.jsdelivr.net/gh/paulirish/lite-youtube-embed@master/src/lite-yt-embed.css'),
        },
      ],
    })
    // lazily initialise
    useScript({
      mode: 'client',
      // proxy may improve performance
      src: useProxyAsset('https://cdn.jsdelivr.net/gh/paulirish/lite-youtube-embed@master/src/lite-yt-embed.js'),
      loadStrategy: 'idle',
    })
    return h('lite-youtube', {
      ...props,
    })
  },
})
