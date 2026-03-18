<script lang="ts" setup>
import { useHead, useScriptCrisp } from '#imports'

useHead({ title: 'Crisp - First Party' })
const { status } = useScriptCrisp({ id: 'b1021910-7ace-425a-9ef5-07f49e5ce417' })
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
