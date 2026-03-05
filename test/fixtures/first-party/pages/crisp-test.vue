<script lang="ts" setup>
import { useHead, useScriptCrisp } from '#imports'

useHead({ title: 'Crisp - First Party' })
const { status } = useScriptCrisp({ id: 'test-id' })
</script>

<template>
  <div>
    <h1>Crisp First-Party Test</h1>
    <ClientOnly>
      <div id="status">
        status: {{ status }}
      </div>
    </ClientOnly>
  </div>
</template>
