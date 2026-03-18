<template>
  <div>
    <ScriptPayPalButtons
      class="border border-gray-200 dark:border-gray-800 rounded-lg"
      :components="['paypal-payments']"
      page-type="checkout"
      @ready="onReady"
    >
      <template #default="{ sdkInstance }">
        <button @click="startPayment(sdkInstance)">
          Pay with PayPal
        </button>
      </template>
    </ScriptPayPalButtons>
    <ScriptPayPalMessages />
  </div>
</template>

<script setup lang="ts">
import type { Components, SdkInstance } from '@paypal/paypal-js/sdk-v6'

function onReady(instance: SdkInstance<Components[]>) {
  console.log('PayPal SDK v6 ready', instance)
}

async function startPayment(instance?: SdkInstance<Components[]>) {
  if (!instance)
    return

  const eligibility = await instance.findEligibleMethods()
  if (eligibility.isEligible('paypal')) {
    const session = instance.createPayPalOneTimePaymentSession({
      onApprove: async (data) => {
        console.log('Payment approved:', data.orderId)
      },
      onError: (error) => {
        console.error('Payment error:', error)
      },
    })
    await session.start({ presentationMode: 'auto' })
  }
}
</script>
