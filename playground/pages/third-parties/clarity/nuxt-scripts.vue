<script lang="ts" setup>
import { useHead, useScriptClarity } from '#imports'

useHead({
  title: 'Clarity',
})

// composables return the underlying api as a proxy object and a $script with the script state
const { $script } = useScriptClarity({
  id: 'mqk2m9dr2v',
})
</script>

<template>
  <div>
    <ClientOnly>
      <div>
        status: {{ $script.status }}
      </div>
    </ClientOnly>
  </div>
</template>
