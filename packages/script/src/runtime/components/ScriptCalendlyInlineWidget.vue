<script setup lang="ts">
import type { CSSProperties, HTMLAttributes } from 'vue'
import type { ElementScriptTrigger } from '../types'
import { useHead } from '@unhead/vue'
import { computed, onMounted, ref, watch } from 'vue'
import { useScriptTriggerElement } from '../composables/useScriptTriggerElement'
import { useScriptCalendly } from '../registry/calendly'
import ScriptAriaLoadingIndicator from './ScriptAriaLoadingIndicator.vue'

interface CalendlyPrefill {
  name?: string
  email?: string
  firstName?: string
  lastName?: string
  customAnswers?: Record<string, string>
}
interface CalendlyUtm {
  utmCampaign?: string
  utmSource?: string
  utmMedium?: string
  utmContent?: string
  utmTerm?: string
}
interface CalendlyPageSettings {
  backgroundColor?: string
  hideEventTypeDetails?: boolean
  hideLandingPageDetails?: boolean
  hideGdprBanner?: boolean
  primaryColor?: string
  textColor?: string
}

const {
  url,
  trigger = 'visible',
  prefill,
  utm,
  pageSettings,
  rootAttrs,
  aboveTheFold = false,
  minHeight = '700px',
} = defineProps<{
  url: string
  trigger?: ElementScriptTrigger
  prefill?: CalendlyPrefill
  utm?: CalendlyUtm
  pageSettings?: CalendlyPageSettings
  rootAttrs?: HTMLAttributes
  aboveTheFold?: boolean
  minHeight?: string
}>()

const emit = defineEmits<{
  ready: [api: { Calendly: typeof window.Calendly }]
  error: []
}>()

defineSlots<{
  default?: () => any
  loading?: () => any
  awaitingLoad?: () => any
  error?: () => any
}>()

const rootEl = ref<HTMLDivElement>()
const containerEl = ref<HTMLDivElement>()
const triggerSignal = useScriptTriggerElement({ trigger, el: rootEl })
const instance = useScriptCalendly({ scriptOptions: { trigger: triggerSignal } })
const { onLoaded, status } = instance

if (import.meta.server && aboveTheFold) {
  useHead({
    link: [
      { key: 'nuxt-script-calendly-preconnect', rel: 'preconnect', href: 'https://calendly.com' },
    ],
  })
}

onMounted(() => {
  onLoaded((api) => {
    if (!containerEl.value)
      return
    api.Calendly.initInlineWidget({
      url,
      parentElement: containerEl.value,
      prefill,
      utm,
      pageSettings,
    })
    emit('ready', api)
  })
  watch(status, (s) => {
    if (s === 'error')
      emit('error')
  })
})

const computedRootAttrs = computed<HTMLAttributes>(() => ({
  'aria-busy': status.value === 'loading',
  'aria-label': status.value === 'awaitingLoad'
    ? 'Calendly Inline Widget - Awaiting Load'
    : status.value === 'loading'
      ? 'Calendly Inline Widget - Loading'
      : 'Calendly Inline Widget',
  'aria-live': 'polite',
  'role': 'application',
  'style': { position: 'relative', minHeight, width: '100%' } as CSSProperties,
  ...rootAttrs,
  ...(triggerSignal instanceof Promise ? (triggerSignal as any).ssrAttrs || {} : {}),
}))
</script>

<template>
  <div ref="rootEl" v-bind="computedRootAttrs">
    <div ref="containerEl" :style="{ minWidth: '320px', minHeight, height: '100%', width: '100%' }" />
    <slot v-if="status === 'loading'" name="loading">
      <ScriptAriaLoadingIndicator />
    </slot>
    <slot v-if="status === 'awaitingLoad'" name="awaitingLoad" />
    <slot v-else-if="status === 'error'" name="error" />
    <slot />
  </div>
</template>
