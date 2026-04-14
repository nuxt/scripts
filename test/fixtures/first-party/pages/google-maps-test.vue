<script lang="ts" setup>
import { useHead, useScriptGoogleMaps } from '#imports'

useHead({ title: 'Google Maps - First Party' })
const { status } = useScriptGoogleMaps({ apiKey: 'AIzaSyBtesttesttest' })
</script>

<template>
  <div>
    <h1>Google Maps First-Party Test</h1>
    <ClientOnly>
      <div id="status">
        status: {{ status }}
      </div>
    </ClientOnly>
    <p>Google Maps loads the JS API. With a test key, the script loads but the map won't render.</p>
    <div id="map" style="width: 640px; height: 400px; background: #eee;" />
  </div>
</template>
