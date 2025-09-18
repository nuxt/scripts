<script setup lang="ts">
import type { NavItem } from '@nuxt/content'

const navigation = inject<Ref<NavItem[]>>('navigation')

const route = useRoute()
const navItems = computed(() => {
  const v = route.path.startsWith('/docs') ? navigation?.value?.[0] : navigation?.value?.[1]
  return v?.children || []
})
</script>

<template>
  <UMain class="relative mb-20">
    <svg viewBox="0 0 1440 181" fill="none" xmlns="http://www.w3.org/2000/svg" class="pointer-events-none absolute w-full top-[1px] transition-all text-sky-400 flex-shrink-0 duration-[400ms] opacity-30 z-20"><mask id="path-1-inside-1_414_5526" fill="white"><path d="M0 0H1440V181H0V0Z" /></mask><path d="M0 0H1440V181H0V0Z" fill="url(#paint0_linear_414_5526)" fill-opacity="0.22" /><path d="M0 2H1440V-2H0V2Z" fill="url(#paint1_linear_414_5526)" mask="url(#path-1-inside-1_414_5526)" /><defs><linearGradient id="paint0_linear_414_5526" x1="720" y1="0" x2="720" y2="181" gradientUnits="userSpaceOnUse"><stop stop-color="currentColor" /><stop offset="1" stop-color="currentColor" stop-opacity="0" /></linearGradient><linearGradient id="paint1_linear_414_5526" x1="0" y1="90.5" x2="1440" y2="90.5" gradientUnits="userSpaceOnUse"><stop stop-color="currentColor" stop-opacity="0" /><stop offset="0.395" stop-color="currentColor" /><stop offset="1" stop-color="currentColor" stop-opacity="0" /></linearGradient></defs></svg>
    <UContainer>
      <UPage>
        <template #left>
          <UPageAside>
            <UContentNavigation
              :key="route.path"
              :collapsible="false"
              :navigation="navItems"
              highlight
            />
          </UPageAside>
        </template>

        <slot />
      </UPage>
    </UContainer>
  </UMain>
</template>
