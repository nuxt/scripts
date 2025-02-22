<script setup lang="ts">
import type { NavItem } from '@nuxt/content'

const navigation = inject<Ref<NavItem[]>>('navigation')
const scriptsNavigation = inject<Ref<NavItem[]>>('scripts-navigation')
</script>

<template>
  <UContainer>
    <UPage>
      <template #left>
        <UAside>
          <UNavigationTree :links="mapContentNavigation(($route.path.startsWith('/docs') ? navigation : scriptsNavigation) || [])" />
        </UAside>
      </template>

      <slot />
    </UPage>
  </UContainer>
</template>
