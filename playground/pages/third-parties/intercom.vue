<script lang="ts" setup>
import { useHead, useScriptIntercom } from '#imports'

useHead({
  title: 'Intercom',
})

// composables return the underlying api as a proxy object and a $script with the script state
const instance = useScriptIntercom({ app_id: 'nu034r2a' })
const { $script, Intercom } = instance
console.log('STATUS', typeof $script.status, $script)
</script>

<template>
  <div>
    <ClientOnly>
      <div>
        status: {{ $script.status }}
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
