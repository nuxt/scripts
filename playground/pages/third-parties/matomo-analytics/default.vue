<script lang="ts" setup>
import { useHead } from '#imports'

useHead({
  title: 'Matomo Analytics',
  script: [
    {
      innerHTML: `var _paq = window._paq = window._paq || [];
  /* tracker methods like "setCustomDimension" should be called before "trackPageView" */
  _paq.push(['trackPageView']);
  _paq.push(['enableLinkTracking']);
  (function() {
    var u="https://nuxt.matomo.cloud/";
    _paq.push(['setTrackerUrl', u+'matomo.php']);
    _paq.push(['setSiteId', '1']);
    var d=document, g=d.createElement('script'), s=d.getElementsByTagName('script')[0];
    g.async=true; g.src='https://cdn.matomo.cloud/nuxt.matomo.cloud/matomo.js'; s.parentNode.insertBefore(g,s);
  })();`,
    },
  ],
})
</script>

<template>
  <div>
    matomo default
  </div>
</template>
