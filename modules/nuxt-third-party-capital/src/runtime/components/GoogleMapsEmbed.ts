/* eslint-disable no-console */
import { defineComponent, h } from 'vue'
import { GoogleMapsEmbed as TPCGoogleMapEmbed } from 'third-party-capital'
import type { PropType } from 'vue'
import { validateRequiredOptions } from '../util'

export type MapMode = 'place' | 'view' | 'directions' | 'streetview' | 'search'
export type MapType = 'roadmap' | 'satellite'

export const GoogleMapsEmbed = defineComponent({
  name: 'GoogleMapsEmbed',
  props: {
    apiKey: { type: String, required: true },
    /**
     * How the map should be displayed.
     */
    mapMode: { type: String as PropType<MapMode>, required: false, default: 'place' },
    /**
     * Defines map marker location.
     *
     * @example City Hall, New York, NY
     */
    q: { type: String, required: true },
    /**
     * Defines center of the map view.
     *
     * @example 37.4218,-122.0840
     */
    center: { type: String, required: false },
    /**
     * Sets initial zoom level of the map.
     *
     * @example 10
     */
    zoom: { type: Number, required: false },
    /**
     * Defines type of map tiles to load.
     */
    mapType: { type: String as PropType<MapType>, required: false },
    /**
     * Defines the language to use for UI elements and for the display of labels on map tiles.
     * By default, visitors will se a map in their own language. This parameter is only supported for some country tiles;
     * if the specific language requested is not supported for the tile set,
     * then the default language for that tileset will be used.
     */
    language: { type: String, required: false },
    /**
     * Defines the appropriate borders and labels to display, based on geopolitical sensitivities.
     */
    region: { type: String, required: false },
    /**
     * Defines the width of the map.
     */
    width: { type: String, required: false },
    /**
     * Defines the height of the map
     */
    height: { type: String, required: false },
  },
  setup(props) {
    const { apiKey, mapMode, ...restProps } = props
    const formattedProps = { ...restProps, key: apiKey }
    const { html: innerHTML, id } = TPCGoogleMapEmbed(formattedProps)
    validateRequiredOptions(id, formattedProps, ['key'])

    console.log('mapMode not currently supported by tpc: ', mapMode)
    return () => h('div', { class: 'google-maps-container', innerHTML })
  },
})

export default GoogleMapsEmbed
