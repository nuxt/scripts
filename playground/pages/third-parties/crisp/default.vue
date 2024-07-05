<script lang="ts" setup>
import { useHead } from '#imports'

useHead({
  script: [
    {
      innerHTML: 'window.$crisp=[];window.CRISP_WEBSITE_ID="b1021910-7ace-425a-9ef5-07f49e5ce417";(function(){d=document;s=d.createElement("script");s.src="https://client.crisp.chat/l.js";s.async=1;d.getElementsByTagName("head")[0].appendChild(s);})();',
    },
  ],
})
</script>

<template>
  <div>
    crisp
  </div>
</template>
