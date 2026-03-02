<script lang="ts" setup>
import { useHead, useScriptIntercom } from '#imports'

useHead({ title: 'Intercom - First Party' })
const { status } = useScriptIntercom({ app_id: 'test-app' })
</script>

<template>
  <div>
    <h1>Intercom First-Party Test</h1>
    <ClientOnly>
      <div id="status">
        status: {{ status }}
      </div>
    </ClientOnly>
  </div>
</template>
