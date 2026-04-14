<script lang="ts" setup>
import { useHead, useScriptCrisp } from '#imports'
import { ref } from 'vue'

useHead({ title: 'Crisp - First Party' })
const { status, proxy } = useScriptCrisp({ id: 'b1021910-7ace-425a-9ef5-07f49e5ce417' })
const result = ref('')

function openChat() {
  proxy.$crisp.push(['do', 'chat:open'])
  result.value = 'Chat opened'
}

function sendMessage() {
  proxy.$crisp.push(['do', 'message:send', ['text', 'Hello from test!']])
  result.value = 'Message sent'
}
</script>

<template>
  <div>
    <h1>Crisp First-Party Test</h1>
    <ClientOnly>
      <div id="status">
        status: {{ status }}
      </div>
    </ClientOnly>
    <div style="margin-top: 20px;">
      <button @click="openChat">
        Open Chat Widget
      </button>
      <button @click="sendMessage">
        Send Test Message
      </button>
      <p v-if="result">
        {{ result }}
      </p>
    </div>
  </div>
</template>
