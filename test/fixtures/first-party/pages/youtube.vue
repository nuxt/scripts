<script lang="ts" setup>
import { useHead, useScriptYouTubePlayer } from '#imports'

useHead({ title: 'YouTube Player - First Party' })
const { status } = useScriptYouTubePlayer({ scriptOptions: { trigger: 'client' } })
</script>

<template>
  <div>
    <h1>YouTube Player First-Party Test</h1>
    <ClientOnly>
      <div id="status">
        status: {{ status }}
      </div>
    </ClientOnly>
    <ClientOnly>
      <div style="margin-top: 20px;">
        <ScriptYouTubePlayer video-id="dQw4w9WgXcQ" style="width: 640px; height: 360px;" />
      </div>
    </ClientOnly>
  </div>
</template>
