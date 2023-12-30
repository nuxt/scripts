import { defineComponent, h } from 'vue'
import { YouTubeEmbed as TPCYoutubeEmbed } from 'third-party-capital'
import { convertThirdPartyCapital, formatDimensionValue, validateRequiredOptions } from '../util'

export const YoutubeEmbed = defineComponent({
  name: 'YoutubeEmbed',
  props: {
    videoid: { type: String, required: true },
    playlabel: { type: String, required: true },
    width: { type: String, required: false, default: '100%' },
    height: { type: String, required: false, default: '100%' },
    params: { type: String, required: false, default: undefined },
  },
  async setup(props) {
    const { videoid, playlabel } = props
    const yt = TPCYoutubeEmbed({ videoid, playlabel })
    validateRequiredOptions(yt.id, props, ['videoid', 'playlabel'])

    convertThirdPartyCapital({
      data: yt,
      mainScriptKey: 'lite-yt-embed',
      options: {},
      use: () => { },
    })

    return () => h('div', { class: 'lite-youtube-container', innerHTML: yt.html, style: { width: formatDimensionValue(props.width), height: formatDimensionValue(props.height) } })
  },
})

export default YoutubeEmbed
