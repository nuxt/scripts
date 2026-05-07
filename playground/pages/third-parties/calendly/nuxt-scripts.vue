<script lang="ts" setup>
import { useTemplateRef } from 'vue'
import { onMounted, useHead, useScriptCalendly } from '#imports'

useHead({
  title: 'Calendly',
})

const CALENDLY_URL = 'https://calendly.com/d/cmpd-djc-mng/test-event'

const inlineRoot = useTemplateRef<HTMLElement>('inlineRoot')

const { status, proxy, onLoaded } = useScriptCalendly()

onMounted(() => {
  onLoaded(({ Calendly }) => {
    if (inlineRoot.value) {
      Calendly.initInlineWidget({
        url: CALENDLY_URL,
        parentElement: inlineRoot.value,
      })
    }
  })
})

function openPopup() {
  proxy.Calendly.initPopupWidget({ url: CALENDLY_URL })
}
</script>

<template>
  <div>
    <ClientOnly>
      <div>
        status: {{ status }}
      </div>
      <div class="space-x-2 mt-2">
        <UButton @click="openPopup">
          Open popup
        </UButton>
      </div>
    </ClientOnly>
    <div ref="inlineRoot" class="mt-4" style="min-width: 320px; height: 700px" />
  </div>
</template>
