# Nuxt Third Party Capital

A collection of third-party wrappers (components and composables) built by Nuxt and [Chrome Aurora](https://developer.chrome.com/aurora), which simplify how to integrate a third-party into your Nuxt application.
Out of the box, these wrappers load third-parties in the most performant way, with best practices provided by [third-party-capital](https://github.com/GoogleChromeLabs/third-party-capital). 

## Supported Third Parties

The third-party resources that are currently provided in Nuxt Third Party Capital are:
- Google Analytics - [useGoogleAnalytics](#usegoogleanalytics)
- Google Tag Manager - [useGoogleTagManager](#usegoogletagmanager)
- Google Maps - [GoogleMaps](#googlemaps)
- Youtube - [YoutubeEmbed](#youtubeembed)

## useGoogleAnalytics

The useGoogleAnalytics composable function allows you to load and initialize [Google Analytics](https://analytics.google.com/analytics/web/).

### Params

Type: `options?: ThirdPartyScriptOptions<GoogleAnalyticsOptions, GoogleAnalyticsApi>`

An object containing the following options:

| name | type   | description                     |
|:-----|:-------|:--------------------------------|
| id   | string | Google Analytics [measurement ID](https://support.google.com/analytics/answer/12270356). (required) |

### Return values

An object that contains a special `$script` property that gives you access to the underlying script instance.

- `$script.waitForLoad`: A promise that resolves when the script is ready to use. It exposes `gtag` and `dataLayer`, which lets you interact with the API.

[useScript documentation](https://unhead.unjs.io/usage/composables/use-script)

### Minimal example

```JavaScript
<script setup>

import { useGoogleAnalytics } from '#imports'

useGoogleAnalytics({ id: 'GA-123456789-1' })

</script>
```
### Example with custom event

```JavaScript
<script setup>

import { useGoogleAnalytics } from '#imports'

const { $script } = useGoogleAnalytics({
  id: 'GA-123456789-1',
})

$script.waitForLoad().then(({ gtag }) => {
  gtag('event', 'some_custom_event', { time: new Date() })
})

</script>
```

## useGoogleTagManager

The useGoogleTagManager composable function allows you to install [Google Tag Manager](https://developers.google.com/tag-platform/tag-manager/web).

### Params

Type: `options?: ThirdPartyScriptOptions<GoogleTagManagerOptions, GoogleTagManagerApi>`

An object containing the following options:

| name | type   | description                      |
|:-----|:-------|:--------------------------------|
| id   | string | Google Tag Manager id. (required)|

### Return values

An object that contains a special `$script` property that gives you access to the underlying script instance.

- `$script.waitForLoad`: A promise that resolves when the script is ready to use. It exposes `google_tag_manager` and `dataLayer`, which lets you interact with the API.

[useScript documentation](https://unhead.unjs.io/usage/composables/use-script)

### Minimal example

```JavaScript
<script setup>

import { useGoogleTagManager } from '#imports'

useGoogleTagManager({ id: 'GTM-123456' })

</script>
```
### Example with pageview event

```JavaScript
<script setup>

import { useGoogleTagManager } from '#imports'

const { $script } = useGoogleTagManager({
  id: 'GTM-123456',
})

$script.waitForLoad().then(({ dataLayer }) => {
  dataLayer.push({
    event: 'pageview',
    page_path: '/google-tag-manager',
  })
})

</script>
```

## GoogleMaps

The GoogleMaps component feels like a Google Maps Embed, but uses the [Maps JavaScript API](https://developers.google.com/maps/documentation/javascript) to load and initialize the map. 

Note: You need an api key to use Google Maps.

### Params

An object containing the following options:

| name | type | description                       |
|:-----|:-------|:--------------------------------|
| apiKey | string | The [api key](https://developers.google.com/maps/documentation/javascript/get-api-key) needed to use Google Maps API. (required)|
| q | string | A query to search for. (optional)|
| center | LatLng | Coordinates to set the map to. (optional) |
| zoom | number | Zoom value for the map. (optional) |
| width | string | Width of the player. (optional)|
| height | string | Height of the player. (optional)|

Either a query (`q`) or coordinates (`center`) are needed for the map to function properly.

**Note** Camel-case prop names are assigned kebab-cased in DOM templates (see [Prop name casing](https://vuejs.org/style-guide/rules-strongly-recommended.html#prop-name-casing)).

### Example with a query

```JavaScript
<template>
  <div>
    <GoogleMaps
      api-key="API_KEY"
      width="600"
      height="400"
      q="Space+Needle,Seattle+WA"
    />
  </div>
</template>
```

### Example with coordinates

```JavaScript
<template>
  <div>
    <GoogleMaps
      api-key="API_KEY"
      width="600"
      height="400"
      :center="{ lat: 47.62065090386302, lng: -122.34932031714334 }"
    />
  </div>
</template>
```

## YoutubeEmbed

The YoutubeEmbed component is based on [lite-youtube-embed](https://github.com/paulirish/lite-youtube-embed).

### Params

An object containing the following options:

| name | type | description                       |
|:-----|:-------|:--------------------------------|
| videoId | string | The id of the video. (required)|
| playLabel | string | The label of the play button. This is for a11y purposes. (required)|
| width | string | Width of the player. (optional)|
| height | string | Height of the player. (optional)|
| params | object | [Parameters](https://developers.google.com/youtube/player_parameters#Parameters) for the player. (optional)|


**Note** Camel-case prop names are assigned kebab-cased in DOM templates (see [Prop name casing](https://vuejs.org/style-guide/rules-strongly-recommended.html#prop-name-casing)).

### Minimal Example

```JavaScript
<template>
  <div>
    <YoutubeEmbed
      video-id="d_IFKP1Ofq0"
      play-label="Play"
    />
  </div>
</template>
```
