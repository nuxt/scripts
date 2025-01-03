<script lang="ts" setup>
import { useHead } from '#imports'

useHead({
  script: [
    { innerHTML: '(function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function()\n'
      + '{a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};\n'
      + 'a.queue=[];var s=\'script\';r=t.createElement(s);r.async=!0;\n'
      + 'r.src=n;var u=t.getElementsByTagName(s)[0];\n'
      + 'u.parentNode.insertBefore(r,u);})(window,document, \'https://sc-static.net/scevent.min.js\');\n'
      + 'window.snaptr(\'init\', \'2295cbcc-cb3f-4727-8c09-1133b742722c\');',
    },
  ],
})

function triggerEvent() {
  window.snaptr('track', 'PAGE_VIEW')
}
</script>

<template>
  <div>
    <UButton @click="() => triggerEvent()">
      Trigger Event
    </UButton>
  </div>
</template>
