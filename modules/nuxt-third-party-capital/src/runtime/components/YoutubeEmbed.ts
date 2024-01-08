import { defineComponent, h, ref, watch } from 'vue'
import { YouTubeEmbed as TPCYoutubeEmbed } from 'third-party-capital'
import { convertThirdPartyCapital, formatDimensionValue, validateRequiredOptions } from '../util'

/**
 * YoutubeEmbed
 *
 * A 3P wrapper component that takes the props to feed into third-party-capital({@link https://github.com/GoogleChromeLabs/third-party-capital}), which returns data to define and build the component.
 */
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
    const ytRef = ref(TPCYoutubeEmbed({ videoid: props.videoid, playlabel: props.playlabel }))

    if (import.meta.client)
      watch(props, () => ytRef.value = TPCYoutubeEmbed({ videoid: props.videoid, playlabel: props.playlabel }))

    validateRequiredOptions(ytRef.value.id, props, ['videoid', 'playlabel'])

    convertThirdPartyCapital({
      data: ytRef.value,
      mainScriptKey: 'lite-yt-embed',
      options: {},
      use: () => { },
    })

    return () => h('div', { class: 'lite-youtube-container', innerHTML: ytRef.value.html, style: { width: formatDimensionValue(props.width), height: formatDimensionValue(props.height) } })
  },
})

export default YoutubeEmbed
