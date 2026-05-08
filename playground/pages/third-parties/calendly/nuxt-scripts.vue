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

function openBadge() {
  proxy.Calendly.initBadgeWidget({
    url: CALENDLY_URL,
    text: 'Schedule time with me',
    color: '#0069ff',
    textColor: '#ffffff',
  })
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
        <UButton @click="openBadge">
          Show badge
        </UButton>
      </div>
    </ClientOnly>

    <h2 class="mt-6 text-lg font-semibold">
      Composable (manual initInlineWidget)
    </h2>
    <div ref="inlineRoot" class="mt-2" style="min-width: 320px; height: 700px" />

    <h2 class="mt-6 text-lg font-semibold">
      Component (&lt;ScriptCalendlyInlineWidget&gt;)
    </h2>
    <ScriptCalendlyInlineWidget
      :url="CALENDLY_URL"
      class="mt-2"
      above-the-fold
      :page-settings="{ hideEventTypeDetails: false, hideGdprBanner: true }"
    />
  </div>
</template>
