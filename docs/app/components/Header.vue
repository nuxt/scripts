<script setup lang="ts">
import type { NavItem } from '@nuxt/contents'

const navigation = inject<Ref<NavItem[]>>('navigation')
// const { metaSymbol } = useShortcuts()
const { header } = useAppConfig()
const route = useRoute()
const links = [
  {
    label: 'Guides',
    to: '/docs/getting-started',
  },
  {
    label: 'Script Registry',
    to: '/scripts',
  },
  {
    label: 'Learn',
    to: '/learn',
  },
]

const navItems = computed(() => {
  const v = route.path.startsWith('/docs') ? navigation?.value?.[0] : navigation?.value?.[1]
  return v?.children || []
})
</script>

<template>
  <UHeader :ui="{}" :links="links">
    <UNavigationMenu :items="links" />

    <template #title>
      <div class="flex items-center gap-3">
        <Logo />
        <UBadge class="hidden md:block" size="sm" color="warning" variant="subtle">
          Beta
        </UBadge>
      </div>
    </template>

    <template #right>
      <!--      <UTooltip text="Search" :shortcuts="[metaSymbol, 'K']" :popper="{ strategy: 'absolute' }"> -->
      <!--        <UContentSearchButton :label="null" /> -->
      <!--      </UTooltip> -->
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

    <template #body>
      <UNavigationMenu
        :items="links"
        orientation="vertical"
        class="-mx-2.5"
      />
      <template v-if="route.path.startsWith('/docs/')">
        <UContentNavigation
          :key="route.path"
          :collapsible="false"
          :navigation="navItems"
          highlight
        />
      </template>
    </template>
  </UHeader>
</template>
