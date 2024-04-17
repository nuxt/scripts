import { defineComponent, h, ref, watch } from 'vue'
import * as tpc from 'third-party-capital'
import { convertThirdPartyCapital, formatDimensionValue } from '../util'
import { useHead, useScript } from '#imports'

/**
 * YoutubeEmbed
 *
 * A 3P wrapper component that takes the props to feed into third-party-capital({@link https://github.com/GoogleChromeLabs/third-party-capital}), which returns data to define and build the component.
 */
const YoutubeEmbed = defineComponent({
  name: 'YoutubeEmbed',
  props: {
    videoId: { type: String, required: true },
    playLabel: { type: String, required: true },
    width: { type: String, required: false, default: '100%' },
    height: { type: String, required: false, default: '100%' },
    params: { type: String, required: false, default: undefined },
  },
  async setup(props) {
    const ytRef = ref(tpc.YouTubeEmbed({ videoid: props.videoId, playlabel: props.playLabel }))

    if (import.meta.client)
      watch(props, () => ytRef.value = tpc.YouTubeEmbed({ videoid: props.videoId, playlabel: props.playLabel }))

    const { useHeadInput, useScriptInput } = convertThirdPartyCapital('lite-yt-embed', ytRef.value)
    useScript(useScriptInput, {
      beforeInit: () => useHead(useHeadInput),
    })

    return () => h('div', { class: 'lite-youtube-container', innerHTML: ytRef.value.html, style: {
      width: formatDimensionValue(props.width),
      height: formatDimensionValue(props.height),
    } })
  },
})

export default YoutubeEmbed
