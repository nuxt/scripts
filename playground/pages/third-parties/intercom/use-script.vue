<script lang="ts" setup>
import { useHead, useScriptIntercom } from '#imports'

useHead({
  title: 'Intercom',
})

// composables return the underlying api as a proxy object and the script state
const { status, proxy } = useScriptIntercom({ app_id: 'nu034r2a' })
</script>

<template>
  <div>
    <ClientOnly>
      <div>
        status: {{ status }}
      </div>
      <div>
        <UButton @click="proxy.Intercom('show')">
          Show
        </UButton>
      </div>
      <div>
        <UButton @click="proxy.Intercom('hide')">
          Hide
        </UButton>
      </div>
      <div>
        <UButton @click="proxy.Intercom('showNewMessage', 'hey!')">
          Hello
        </UButton>
      </div>
    </ClientOnly>
  </div>
</template>
