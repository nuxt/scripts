<script lang="ts" setup>
import { useHead, useScriptIntercom } from '#imports'

useHead({
  title: 'Intercom',
})

// composables return the underlying api as a proxy object and the script state
const instance = useScriptIntercom({ app_id: 'nu034r2a' })
const { status, Intercom } = instance
</script>

<template>
  <div>
    <ClientOnly>
      <div>
        status: {{ status }}
      </div>
      <div>
        <button @click="Intercom('show')">
          Show
        </button>
      </div>
      <div>
        <button @click="Intercom('hide')">
          Hide
        </button>
      </div>
      <div>
        <button @click="Intercom('showNewMessage', 'hey!')">
          Hello
        </button>
      </div>
    </ClientOnly>
  </div>
</template>
