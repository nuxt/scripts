<script lang="ts" setup>
import { useHead } from '#imports'

useHead({
  script: [
    { innerHTML: `!(function (w, d) { if (!w.rdt) { var p = w.rdt = function () { p.sendEvent ? p.sendEvent.apply(p, arguments) : p.callQueue.push(arguments) } p.callQueue = [] var t = d.createElement('script') t.src = 'https://www.redditstatic.com/ads/pixel.js', t.async = !0 var s = d.getElementsByTagName('script')[0] s.parentNode.insertBefore(t, s) } }(window, document)) rdt('init', 'YOUR_PIXEL_ID') rdt('track', 'PageVisit')` },
  ],
})

function triggerEvent() {
  window.rdt('init', 'YOUR_PIXEL_ID')
  window.rdt('track', 'PageVisit')
}
</script>

<template>
  <div>
    <UButton @click="() => triggerEvent()">
      Trigger Event
    </UButton>
  </div>
</template>
