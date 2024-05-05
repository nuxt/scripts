<script lang="ts" setup>
import { useHead } from '#imports'

useHead({
  title: 'Stripe',
})
</script>

<template>
  <div>
    <UCard class="mb-12">
      <template #header>
        <h2>ScriptStripePricingTableEmbed</h2>
      </template>
      <ScriptStripePricingTable
        pricing-table-id="prctbl_1P4biOEclFNgdHcRXgXgVwP8"
        publishable-key="pk_live_51OhXSKEclFNgdHcRNi5xBjBClxsA0alYgt6NzBwUZ880pLG88rYSCYPQqpzM3TedzNYu5g2AynKiPI5QVLYSorLJ002iD4VZIB"
      />
    </UCard>
  </div>
</template>
