<script lang="ts" setup>
import { useHead, useScriptVimeoPlayer } from '#imports'

useHead({ title: 'Vimeo Player - First Party' })
const { status } = useScriptVimeoPlayer({ scriptOptions: { trigger: 'client' } })
</script>

<template>
  <div>
    <h1>Vimeo Player First-Party Test</h1>
    <ClientOnly>
      <div id="status">
        status: {{ status }}
      </div>
    </ClientOnly>
    <ClientOnly>
      <div style="margin-top: 20px;">
        <ScriptVimeoPlayer :id="331567154" style="width: 640px; height: 360px;" />
      </div>
    </ClientOnly>
  </div>
</template>
