<script lang="ts" setup>
import { ref } from 'vue'
import { useHead, useScriptGravatar } from '#imports'

useHead({
  title: 'Gravatar',
})

const { proxy, status } = useScriptGravatar()

const avatarUrl = ref('')
const emailAvatarUrl = ref('')

function loadByHash() {
  // SHA256 of "test@example.com"
  avatarUrl.value = proxy.getAvatarUrl('973dfe463ec85785f5f95af5ba3906eedb2d931c24e69824a89ea65dba4e813b', { size: 200 })
}

function loadByEmail() {
  emailAvatarUrl.value = proxy.getAvatarUrlFromEmail('test@example.com', { size: 200 })
}
</script>

<template>
  <div>
    <ClientOnly>
      <div id="status">
        {{ status }}
      </div>
    </ClientOnly>
    <button id="load-hash" @click="loadByHash">
      Load by Hash
    </button>
    <button id="load-email" @click="loadByEmail">
      Load by Email
    </button>
    <div v-if="avatarUrl" id="avatar-url">
      {{ avatarUrl }}
    </div>
    <div v-if="emailAvatarUrl" id="email-avatar-url">
      {{ emailAvatarUrl }}
    </div>
    <img v-if="avatarUrl" id="avatar-img" :src="avatarUrl" alt="Gravatar">
    <img v-if="emailAvatarUrl" id="email-avatar-img" :src="emailAvatarUrl" alt="Gravatar">
  </div>
</template>
