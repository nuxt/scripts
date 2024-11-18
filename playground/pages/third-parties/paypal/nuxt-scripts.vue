<template>
  <div>
    <h2>Buttons</h2>
    <ScriptPaypalButtons
      class="border border-gray-200 dark:border-gray-800 rounded-lg"
      :button-options="buttonOptions"
      :disabled="disabled"
    />
    <label>
      Disabled
      <input v-model="disabled" type="checkbox">
    </label>
    <h2>Marks</h2>
    <ScriptPaypalMarks />
    <h2>Messages</h2>
    <ScriptPaypalMessages :messages-options="{ style: { color: 'white-no-border', layout: 'flex' } }" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { PayPalButtonsComponentOptions } from '@paypal/paypal-js'

const buttonOptions = computed(() => ({
  style: {
    layout: 'vertical',
    color: 'blue',
    shape: 'rect',
    label: 'paypal',
  },
  message: { amount: '10.00' },
} satisfies PayPalButtonsComponentOptions))

const disabled = ref(false)
</script>
