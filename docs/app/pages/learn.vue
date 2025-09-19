<script setup lang="ts">
useSeoMeta({
  title: 'Learn Nuxt Scripts',
  description: 'Follow along with the Nuxt Scripts intro videos for a fun and interactive way to learn how to use Nuxt Scripts.',
})

defineOgImageComponent('Home')
</script>

<template>
  <div>
    <UPageSection :ui="{ wrapper: 'pt-0 py-6 sm:py-14' }">
      <div class="text-center">
        <UIcon name="i-ph-book-bookmark-duotone" class="h-[50px] w-[50px] text-primary" />
        <h2 class="text-xl xl:text-4xl font-bold mb-12 text-center">
          Watch the intro videos from the pros.
        </h2>
        <div class="lg:flex justify-between gap-10 items-center">
          <ScriptYouTubePlayer video-id="sjMqUUvH9AE" class="rounded-xl overflow-hidden group">
            <template #awaitingLoad>
              <div class="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 h-[48px] w-[68px] group-hover:opacity-80 transition">
                <svg height="100%" version="1.1" viewBox="0 0 68 48" width="100%"><path d="M66.52,7.74c-0.78-2.93-2.49-5.41-5.42-6.19C55.79,.13,34,0,34,0S12.21,.13,6.9,1.55 C3.97,2.33,2.27,4.81,1.48,7.74C0.06,13.05,0,24,0,24s0.06,10.95,1.48,16.26c0.78,2.93,2.49,5.41,5.42,6.19 C12.21,47.87,34,48,34,48s21.79-0.13,27.1-1.55c2.93-0.78,4.64-3.26,5.42-6.19C67.94,34.95,68,24,68,24S67.94,13.05,66.52,7.74z" fill="#f00" /><path d="M 45,24 27,14 27,34" fill="#fff" /></svg>
              </div>
            </template>
          </ScriptYouTubePlayer>
          <ScriptYouTubePlayer video-id="jDQtxlRUf54" class="rounded-xl overflow-hidden group">
            <template #awaitingLoad>
              <div class="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 h-[48px] w-[68px] group-hover:opacity-80 transition">
                <svg height="100%" version="1.1" viewBox="0 0 68 48" width="100%"><path d="M66.52,7.74c-0.78-2.93-2.49-5.41-5.42-6.19C55.79,.13,34,0,34,0S12.21,.13,6.9,1.55 C3.97,2.33,2.27,4.81,1.48,7.74C0.06,13.05,0,24,0,24s0.06,10.95,1.48,16.26c0.78,2.93,2.49,5.41,5.42,6.19 C12.21,47.87,34,48,34,48s21.79-0.13,27.1-1.55c2.93-0.78,4.64-3.26,5.42-6.19C67.94,34.95,68,24,68,24S67.94,13.05,66.52,7.74z" fill="#f00" /><path d="M 45,24 27,14 27,34" fill="#fff" /></svg>
              </div>
            </template>
          </ScriptYouTubePlayer>
        </div>
      </div>
    </UPageSection>

    <UPageSection :ui="{ wrapper: 'pt-0 py-6 sm:py-14' }">
      <UPageCTA
        description="Learn all of the fundamentals of Nuxt Scripts in the fun interactive confetti tutorial."
        card
      >
        <template #title>
          Try out our JS Confetti Tutorial
        </template>
        <template #links>
          <div ref="confettiEl">
            <UButton size="xl" variant="solid" icon="i-ph-sparkle-duotone" color="primary" to="/docs/getting-started/confetti-tutorial">
              Get started
            </UButton>
          </div>
        </template>
      </UPageCTA>
    </UPageSection>
  </div>
</template>
