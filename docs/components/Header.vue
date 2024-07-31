<script setup lang="ts">
import type { NavItem } from '@nuxt/content/dist/runtime/types'

const navigation = inject<NavItem[]>('navigation', [])
const { metaSymbol } = useShortcuts()
const { header } = useAppConfig()
const links = [
  {
    label: 'Guides',
    to: '/docs/getting-started',
  },
  {
    label: 'Script Registry',
    to: '/scripts',
    icon: 'i-ph-floppy-disk-duotone',
  },
]
</script>

<template>
  <UHeader :ui="{}" :links="links">
    <template #logo>
      <Logo />
      <UBadge class="ml-5 hidden md:block" size="xs" color="yellow" variant="subtle">
        Beta
      </UBadge>
    </template>

    <template #right>
      <UTooltip text="Search" :shortcuts="[metaSymbol, 'K']" :popper="{ strategy: 'absolute' }">
        <UContentSearchButton :label="null" />
      </UTooltip>
      <UColorModeButton />
      <template v-if="header?.links">
        <UButton
          v-for="(link, index) of header.links"
          :key="index"
          icon="i-ph-floppy-disk-duotone"
          v-bind="{ color: 'gray', variant: 'ghost', ...link }"
        />
      </template>
    </template>

    <template #panel>
      <UNavigationTree :links="mapContentNavigation(navigation)" />
    </template>
  </UHeader>
</template>
