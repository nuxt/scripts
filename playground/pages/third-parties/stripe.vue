<script lang="ts" setup>
import { useHead, useScriptStripe } from '#imports'

useHead({
  title: 'Stripe',
})

const { $script } = useScriptStripe()
$script.then(({ Stripe }) => {
  const stripe = Stripe('pk_test_TYooMQauvdEDq54NiTphI7jx')
  const elements = stripe.elements({
    mode: 'payment',
    currency: 'usd',
    amount: 1099,
  })
  const paymentElement = elements.create('payment', {})
  paymentElement.mount('#payment-element')
})
</script>

<template>
  <StripePricingTableEmbed
    pricing-table-id="prctbl_1P4biOEclFNgdHcRXgXgVwP8"
    publishable-key=""
  />
  <div id="payment-element" />
</template>
