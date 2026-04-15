<script setup lang="ts">
interface Props {
  text?: string
  title?: string
  description?: string
  label?: string
  size?: keyof typeof sizes
  iconSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  side?: 'top' | 'bottom' | 'left' | 'right'
}

const { side = 'top' } = defineProps<Props>()

const contentProps = computed(() => ({ side }))
</script>

<script lang="ts">
export const sizes = {
  xs: 'max-w-[80px]',
  sm: 'max-w-[160px]',
  md: 'max-w-[250px]',
  lg: 'max-w-[440px]',
  xl: 'max-w-[640px]',
}
</script>

<template>
  <span v-if="label" class="inline-flex items-center gap-1">
    <span>{{ label }}</span>
    <UPopover
      data-ui="UiTooltip"
      mode="hover"
      role="tooltip"
      :content="contentProps"
      class="inline-flex"
    >
      <UIcon name="i-carbon-help" class="size-3 text-(--color-text-subtle) hover:text-(--color-text-muted) transition-colors" />
      <template #content>
        <div class="ui-tooltip-panel">
          <div :class="`w-max ${sizes[size || 'md']}`">
            <template v-if="title">
              <div class="font-semibold">
                {{ title }}
              </div>
              <div v-if="description" class="text-(--color-text-muted) text-xs">
                {{ description }}
              </div>
            </template>
            <template v-else>
              {{ text }}
            </template>
          </div>
        </div>
      </template>
    </UPopover>
  </span>
  <UPopover
    v-else
    data-ui="UiTooltip"
    mode="hover"
    role="tooltip"
    :content="contentProps"
    :class="$slots.default ? 'inline-block' : 'inline-flex'"
  >
    <slot v-if="$slots.default" />
    <UIcon v-else name="i-carbon-help" color="primary" :size="iconSize || 'md'" />
    <template #content>
      <div class="ui-tooltip-panel">
        <div :class="`w-max ${sizes[size || 'md']}`">
          <slot v-if="$slots.text" name="text" />
          <template v-else-if="title">
            <div class="font-semibold">
              {{ title }}
            </div>
            <div v-if="description" class="text-(--color-text-muted) text-xs">
              {{ description }}
            </div>
          </template>
          <template v-else>
            {{ text }}
          </template>
        </div>
      </div>
    </template>
  </UPopover>
</template>

<style scoped>
.ui-tooltip-panel {
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 400;
  white-space: normal;
  line-height: 1.4;
  border-radius: var(--radius-md);
  background: var(--color-surface-elevated);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  pointer-events: none;
  box-shadow: 0 4px 12px oklch(0% 0 0 / 0.1);
}

.dark .ui-tooltip-panel {
  box-shadow: 0 4px 12px oklch(0% 0 0 / 0.3);
}
</style>
