<script lang="ts" setup>
import { useHead, useScriptGravatar } from '#imports'

useHead({ title: 'Gravatar - First Party' })
const { status } = useScriptGravatar()
</script>

<template>
  <div>
    <h1>Gravatar First-Party Test</h1>
    <ClientOnly>
      <div id="status">
        status: {{ status }}
      </div>
    </ClientOnly>
    <div style="margin-top: 20px;">
      <ScriptGravatar email="info@gravatar.com" :size="80" />
    </div>
  </div>
</template>
