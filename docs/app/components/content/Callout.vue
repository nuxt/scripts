<template>
  <div :class="[ui.wrapper, to && ui.to]" v-bind="attrs" :style="{ '--color-light': colorLight, '--color-dark': colorDark }">
    <NuxtLink v-if="to" :to="to" :target="target" class="focus:outline-none" tabindex="-1">
      <span class="absolute inset-0" aria-hidden="true" />
    </NuxtLink>

    <UIcon v-if="icon" :name="icon" :class="ui.icon.base" />

    <UIcon v-if="!!to && target === '_blank'" :name="ui.externalIcon.name" :class="ui.externalIcon.base" />

    <slot mdc-unwrap="p" />
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import colors from '#tailwind-config/theme/colors'
import type uiColors from '#ui-colors'

const appConfig = useAppConfig()

const config = computed(() => ({
  wrapper: 'block pl-4 pr-6 py-3 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm/6 my-5 last:mb-0 font-normal group relative prose-code:bg-white dark:prose-code:bg-gray-900',
  to: 'hover:border-[--color-light] dark:hover:border-[--color-dark] hover:text-[--color-light] dark:hover:text-[--color-dark] border-dashed hover:border-solid hover:text-gray-800 dark:hover:text-gray-200',
  icon: {
    base: 'w-4 h-4 mr-2 inline-flex items-center align-sub text-[--color-light] dark:text-[--color-dark]',
  },
  externalIcon: {
    name: appConfig.ui.icons.external,
    base: 'w-4 h-4 absolute right-2 top-2 text-gray-400 dark:text-gray-500 group-hover:text-[--color-light] dark:group-hover:text-[--color-dark]',
  },
}))

defineOptions({
  inheritAttrs: false,
})

const props = defineProps({
  icon: {
    type: String,
    default: undefined,
  },
  color: {
    type: String as PropType<typeof uiColors[number]>,
    default: 'primary',
  },
  to: {
    type: String,
    default: undefined,
  },
  target: {
    type: String,
    default: undefined,
  },
  class: {
    type: [String, Object, Array] as PropType<any>,
    default: undefined,
  },
  ui: {
    type: Object as PropType<Partial<typeof config.value>>,
    default: () => ({}),
  },
})

const { ui, attrs } = useUI('content.callout', toRef(props, 'ui'), config, toRef(props, 'class'), true)

const colorLight = computed(() => {
  if (props.color === 'primary') {
    return 'rgb(var(--color-primary-DEFAULT))'
  }
  // @ts-expect-error untyped
  return colors[props.color]?.['500'] || (colors[props.color] as string) || props.color
})
const colorDark = computed(() => {
  if (props.color === 'primary') {
    return 'rgb(var(--color-primary-DEFAULT))'
  }
  // @ts-expect-error untyped
  return colors[props.color]?.['400'] || (colors[props.color] as string) || props.color
})

const target = computed(() => props.target || (props.to && props.to.startsWith('http') ? '_blank' : undefined))
</script>
