<script lang="ts" setup>
import {type GoogleAnalyticsInput, GoogleAnalyticsOptions, useHead, useScriptGoogleAnalytics} from '#imports'
import {useRegistryScript} from "#nuxt-scripts-utils";
import {GoogleAnalyticsScriptResolver} from "../../../../src/registry";

useHead({
  title: 'Google Analytics',
})


export function useScriptGoogleAnalytics<T extends GoogleAnalyticsApi>(_options?: GoogleAnalyticsInput) {
  // Note: inputs.useScriptInput is not usable, needs to be normalized
  return useRegistryScript<T, typeof GoogleAnalyticsOptions>('googleAnalytics', options => ({
    scriptInput: {
      src: GoogleAnalyticsScriptResolver(options),
    },
    schema: import.meta.dev ? GoogleAnalyticsOptions : undefined,
    scriptOptions: {
      use() {
        return { dataLayer: window.dataLayer, gtag: window.gtag }
      },
      // allow dataLayer to be accessed on the server
      stub: import.meta.client
        ? undefined
        : ({ fn }) => {
          return fn === 'dataLayer' ? [] : undefined
        },
    },
    clientInit: import.meta.server
      ? undefined
      : () => {
        const w = window
        w.dataLayer = w.dataLayer || []
        const gtag: GTag = function () {
          // eslint-disable-next-line prefer-rest-params
          w.dataLayer.push(arguments)
        }
        gtag('js', new Date())
        gtag('config', options?.id)
        w.gtag = gtag
      },
  }), _options)
}

// composables return the underlying api as a proxy object and a $script with the script state
const { gtag, $script } = useScriptGoogleAnalyticsTpc({
  id: 'G-TR58L0EF8P',
}) // id set via nuxt scripts module config
gtag('event', 'page_view', {
  page_title: 'Google Analytics',
  page_location: 'https://harlanzw.com/third-parties/google-analytics',
  page_path: '/third-parties/google-analytics',
})

function triggerConversion() {
  gtag('event', 'conversion')
}
</script>

<template>
  <div>
    <ClientOnly>
      <div>
        status: {{ $script.status.value }}
      </div>
    </ClientOnly>
    <button @click="triggerConversion">
      Trigger Conversion
    </button>
  </div>
</template>
