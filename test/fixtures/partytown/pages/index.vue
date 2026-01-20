<script setup lang="ts">
// Load custom script in partytown web worker
useScript('/worker-script.js', { partytown: true })

// Load GA with partytown
// Define gtag on main thread - it just pushes to dataLayer which partytown forwards
const GA_ID = 'G-TR58L0EF8P'
useScript(`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`, {
  partytown: true,
  partytownInit: `window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments)};gtag('js',new Date());gtag('config','${GA_ID}');`,
})

const gtagReady = ref(false)
onMounted(() => {
  setTimeout(() => {
    gtagReady.value = typeof window.gtag === 'function'
  }, 500)
})
</script>

<template>
  <div>
    <h1>Partytown Test</h1>
    <div id="status">
      Ready
    </div>
    <div id="gtag-status">
      gtag: {{ gtagReady ? 'ready' : 'loading...' }}
    </div>
  </div>
</template>
