<script setup lang="ts">
import { useScriptRegistry } from '~/composables/useScriptRegistry'

const registry = useScriptRegistry()
const { data: page } = await useAsyncData('index', () => queryContent('/').findOne())

useSeoMeta({
  title: page.value.title,
  ogTitle: page.value.title,
  description: page.value.description,
  ogDescription: page.value.description,
})
</script>

<template>
  <div>
    <ULandingHero
      v-bind="page?.hero" orientation="horizontal"
      :ui="{ container: 'flex flex-row justify-start items-center' }"
    >
      <template #title>
        <div class="leading-tight">
          <span class="text-primary">Third-Party Scripts </span><br> Meets Nuxt DX.
        </div>
      </template>

      <template #description>
        <div class="text-gray-500 dark:text-gray-400 text-xl max-w-2xl leading-normal mb-10">
          Nuxt Scripts lets you load third-party scripts better performance, privacy, security and DX. It includes
          many popular third-parties out of the box.
        </div>
      </template>
      <div class="relative hidden xl:block">
        <div class="absolute -z-1 -right-[450px] -top-[350px]">
          <div class="w-[500px] grid-transform grid grid-cols-3 gap-7">
            <UCard v-for="script in registry" class="card">
              <template v-if="typeof script.logo !== 'string'">
                <div class="logo h-10 w-auto block dark:hidden" v-html="script.logo.light" />
                <div class="logo h-10 w-auto hidden dark:block" v-html="script.logo.dark" />
              </template>
              <div v-else class="logo h-10 w-auto" v-html="script.logo" />
            </UCard>
          </div>
        </div>
      </div>
    </ULandingHero>

    <ULandingSection :ui="{ wrapper: 'py-6 sm:py-12' }">
      <ul class="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-8 lg:gap-y-16">
        <li v-for="feature in page?.features" :key="feature.name" class="flex flex-col gap-y-2">
          <UIcon :name="feature.icon" class="h-8 w-8 shrink-0 text-primary" />
          <div class="flex flex-col gap-y-1">
            <h5 class="font-medium text-gray-900 dark:text-white">
              {{ feature.name }}
            </h5>
            <p class="text-gray-500 dark:text-gray-400">
              {{ feature.description }}
            </p>
          </div>
        </li>
      </ul>
    </ULandingSection>
  </div>
</template>

<style lang="postcss">
.hero_code div div {
  @apply dark:bg-gray-900/60 backdrop-blur-3xl bg-white/60;
}
.radial-fade {
  position: absolute;
  width: 100%;
  height: 100%;
  z-index: 2;
  left: 0;
  top: 0;
}
.grid-transform {
  position: relative;
  transform: perspective(600px) rotateX(-1deg) rotateY(-15deg);
}
.card {
  box-shadow: 5px 5px 7px rgba(0, 0, 0, 0.05);
  transition: transform 0.5s, box-shadow 0.5s;
}
.card svg {
  opacity: 0.5;
}
.card:hover {
  box-shadow: 10px 10px 14px rgba(0, 0, 0, 0.1);
}
.card:hover svg {
  opacity: 1;
}
.card svg {
  shape-rendering: geometricPrecision;
}
</style>
