<script setup lang="ts">
import type { PropType } from 'vue'

defineOptions({
  inheritAttrs: false,
})

defineProps({
  class: {
    type: [String, Object, Array] as PropType<any>,
    default: undefined,
  },
})

const ui = {
  wrapper: 'relative [&>div:last-child]:!my-0 [&>div:last-child]:!static my-5',
  header: 'flex items-center gap-1 border border-gray-200 dark:border-gray-700 border-b-0 rounded-t-md overflow-hidden p-2',
  tab: {
    base: 'px-2 py-1.5 focus:outline-none text-gray-700 dark:text-gray-200 text-sm rounded-md flex items-center gap-1.5',
    active: 'bg-gray-100 dark:bg-gray-800',
    inactive: 'hover:bg-gray-50 dark:hover:bg-gray-800/50',
    icon: {
      base: '',
    },
  },
}

const slots = useSlots()

const rerenderCounter = ref(1)

function transformSlot(slot: any, index: number) {
  if (typeof slot.type === 'symbol') {
    return slot.children?.map(transformSlot)
  }

  return {
    label: slot.props?.filename || slot.props?.label || `${index}`,
    icon: slot.props?.icon,
    component: slot,
  }
}

// Computed

const tabs = computed(() => slots.default?.()?.flatMap(transformSlot).filter(Boolean) || [])

const { selectedFramework } = useFrameworkSelector()
const selectedIndex = ref(tabs.value.findIndex(tab => tab.label.toLowerCase() === selectedFramework.value.slug))
defineExpose({ selectedIndex })

const selectedTab = computed(() => tabs.value.find((_, index) => index === selectedIndex.value))

onBeforeUpdate(() => {
  rerenderCounter.value += 1
})
</script>

<template>
  <div :class="ui.wrapper" class="relative group [&>.group]:rounded-t-none [&>pre]:my-0 my-5">
    <div :class="ui.header">
      <button
        v-for="(tab, index) in tabs"
        :key="index"
        tabindex="-1"
        :class="[ui.tab.base, selectedIndex === index ? ui.tab.active : ui.tab.inactive]"
        @click="selectedIndex = index"
      >
        <ProseCodeIcon :icon="tab.icon" :filename="tab.label" :class="ui.tab.icon.base" />
        <span>{{ tab.label }}</span>
      </button>
    </div>

    <div class="group text-sm/6 border border-[var(--ui-border-muted)] bg-[var(--ui-bg)] rounded-[calc(var(--ui-radius)*1.5)] px-4 py-3 overflow-x-auto focus:outline-none">
      <component :is="selectedTab?.component" :key="selectedIndex" hide-header />
    </div>
  </div>
</template>
