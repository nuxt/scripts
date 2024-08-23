<script lang="ts" setup>
import { useHead, useScriptClarity } from '#imports'

useHead({
  title: 'Clarity',
})

// composables return the underlying api as a proxy object and the script state
const { status } = useScriptClarity({
  id: 'mqk2m9dr2v',
})
</script>

<template>
  <div>
    <ClientOnly>
      <div>
        status: {{ status }}
      </div>
    </ClientOnly>
  </div>
</template>
