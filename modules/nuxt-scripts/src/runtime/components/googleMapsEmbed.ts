import { defineComponent, h } from 'vue'
import { withQuery } from 'ufo'

// TODO maybe delete

interface GoogleMapsOptions {
  apiKey: string
  /**
   * How the map should be displayed.
   */
  mapMode: 'place' | 'view' | 'directions' | 'streetview' | 'search'
  /**
   * Defines map marker location.
   *
   * @example City Hall, New York, NY
   */
  q?: string
  /**
   * Defines center of the map view.
   *
   * @example 37.4218,-122.0840
   */
  center?: string
  /**
   * Sets initial zoom level of the map.
   *
   * @example 10
   */
  zoom?: number
  /**
   * Defines type of map tiles to load.
   */
  maptype?: 'roadmap' | 'satellite'
  /**
   * Defines the language to use for UI elements and for the display of labels on map tiles.
   * By default, visitors will se a map in their own language. This parameter is only supported for some country tiles;
   * if the specific language requested is not supported for the tile set,
   * then the default language for that tileset will be used.
   */
  language?: string
  /**
   * Defines the appropriate borders and labels to display, based on geopolitical sensitivities.
   */
  region?: string
}

export const GoogleMapsEmbed = defineComponent<GoogleMapsOptions>({
  name: 'GoogleMapsEmbed',
  setup(props) {
    const src = withQuery(`https://www.google.com/maps/embed/v1/${props.mapMode}`, {
      key: props.apiKey,
      q: props.q,
      center: props.center,
      zoom: props.zoom,
      maptype: props.maptype,
      language: props.language,
      region: props.region,
    })
    return h('iframe', {
      src,
      referrerpolicy: 'no-referrer-when-downgrade',
      frameborder: '0',
      style: 'border:0',
      allowfullscreen: true,
      width: null,
      height: null,
    })
  },
})
