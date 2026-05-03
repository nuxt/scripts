<script lang="ts" setup>
import { useHead } from '#imports'

useHead({
  script: [
    {
      innerHTML: `_linkedin_partner_id = "111143"; window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || []; window._linkedin_data_partner_ids.push(_linkedin_partner_id);`,
    },
    {
      innerHTML: `(function(l) { if (!l){window.lintrk = function(a,b){window.lintrk.q.push([a,b])}; window.lintrk.q=[]} var s = document.getElementsByTagName("script")[0]; var b = document.createElement("script"); b.type = "text/javascript"; b.async = true; b.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js"; s.parentNode.insertBefore(b, s);})(window.lintrk);`,
    },
  ],
})

function triggerEvent() {
  ;(window as any).lintrk('track', { conversion_id: 1111111177 })
}
</script>

<template>
  <div>
    <UButton @click="() => triggerEvent()">
      Trigger Event
    </UButton>
  </div>
</template>
