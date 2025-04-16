<script lang="ts" setup>
import { onMounted, useHead, useScriptClarity } from '#imports'

useHead({
  title: 'Clarity',
})

// composables return the underlying api as a proxy object and the script state
const { status, proxy } = useScriptClarity({
  id: 'mqk2m9dr2v',
})

onMounted(() => {
  setTimeout(() => {
    proxy.clarity('consent')
  }, 3000)
})

function accept() {
  window.clarity('consent', true)
}

function decline() {
  window.clarity('consent', false)
}
</script>

<template>
  <div>
    <ClientOnly>
      <div>
        status: {{ status }}
      </div>
      <button @click="accept">
        Force Accept
      </button>
      <button @click="decline">
        Force Decline
      </button>
    </ClientOnly>
  </div>
</template>
