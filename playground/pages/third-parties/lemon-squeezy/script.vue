<script lang="ts" setup>
import { useScriptLemonSqueezy, onMounted } from '#imports'

const { Setup, Refresh } = useScriptLemonSqueezy()
onMounted(() => {
  Refresh()
  Setup({
    eventHandler: (...args) => {
      console.log('handler', args)
    },
  })
})
</script>

<template>
  <UContainer class="py-12 space-y-4">
    <NuxtLink to="/third-parties/lemon-squeezy/component" class="underline">
      Lemon Squeezy Button
    </NuxtLink>
    <UCard>
      <div class="flex justify-between">
        <NuxtLink class="underline" to="/product-1">
          Product 1
        </NuxtLink>
        <UButton
          class="lemonsqueezy-button"
          external
          to="https://store.supersaas.dev/buy/ed9818ff-506d-4378-991c-081e1ecd8087?embed=1"
          target="_blank"
        >
          Buy Now
        </UButton>
      </div>
    </UCard>
    <UCard>
      <div class="flex justify-between">
        <NuxtLink to="/product-1" class="underline">
          Product 2
        </NuxtLink>
        <UButton
          class="lemonsqueezy-button"
          external
          to="https://store.supersaas.dev/buy/ed9818ff-506d-4378-991c-081e1ecd8087?embed=1"
          target="_blank"
        >
          Buy Now
        </UButton>
      </div>
    </UCard>
  </UContainer>
</template>
