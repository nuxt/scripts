<script lang="ts" setup>
import { useHead } from '#imports'

useHead({
  script: [
    { innerHTML: '!function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);\n'
      + '},s.version=\'1.1\',s.queue=[],u=t.createElement(n),u.async=!0,u.src=\'https://static.ads-twitter.com/uwt.js\',\n'
      + 'a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,\'script\');\n'
      + 'twq(\'config\',\'ol7lz\');' },
  ],
})

function triggerEvent() {
  window.twq('event', 'tw-ol7lz-ol7mb', {
    value: 5.00,
  })
}
</script>

<template>
  <div>
    <UButton @click="() => triggerEvent()">
      Trigger Event
    </UButton>
  </div>
</template>
