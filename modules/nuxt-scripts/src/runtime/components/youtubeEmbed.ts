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
        useInlineAsset('https://cdn.jsdelivr.net/gh/paulirish/lite-youtube-embed@master/src/lite-yt-embed.css'),
      ],
    })
    // lazily initialise
    useScript({
      mode: 'client',
      // proxy may improve performance
      // TODO this does not work, we need a Vue compatible library
      src: useProxyAsset('https://cdn.jsdelivr.net/gh/paulirish/lite-youtube-embed@master/src/lite-yt-embed.js'),
      loadStrategy: 'idle',
    })
    // WARNING this does not actually work because we can't seem to use the web component lite-youtube in vue
    return h('lite-youtube', {
      ...props,
    })
  },
})
