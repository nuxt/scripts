<script setup lang="ts">
import { scriptRegistry } from '~/composables/state'

const capabilityDefs = [
  { key: 'bundle', label: 'Bundle', icon: 'i-carbon-archive', desc: 'Downloaded at build time, served from your domain' },
  { key: 'proxy', label: 'Proxy', icon: 'i-carbon-security', desc: 'Collection requests routed through your server' },
  { key: 'partytown', label: 'Partytown', icon: 'i-carbon-container-software', desc: 'Can run in a web worker via Partytown' },
] as const

type CapState = 'active' | 'available' | 'off'

function capState(script: any, capKey: string): CapState {
  const supported = script.capabilities?.[capKey]
  if (!supported) return 'off'
  const active = script.defaultCapability?.[capKey]
  return active ? 'active' : 'available'
}

function capStateLabel(state: CapState): string {
  if (state === 'active') return 'Active by default'
  if (state === 'available') return 'Supported (opt-in)'
  return 'Not supported'
}
</script>

<template>
  <div class="py-1">
    <div v-if="!scriptRegistry?.length" class="panel-grids rounded-xl flex flex-col items-center justify-center py-16 gap-3">
      <div class="w-12 h-12 rounded-xl bg-(--color-surface-elevated) border border-(--color-border) flex items-center justify-center">
        <UIcon name="i-carbon-catalog" class="text-2xl text-(--color-text-subtle)" />
      </div>
      <p class="text-sm font-medium text-(--color-text-muted)">No registry scripts available</p>
    </div>

    <template v-else>
      <!-- Legend -->
      <div class="flex items-center gap-4 mb-3 px-0.5">
        <div class="flex items-center gap-1.5 text-[10px] font-medium text-(--color-text-subtle)">
          <span class="cap-dot cap-dot-active" />
          Active by default
        </div>
        <div class="flex items-center gap-1.5 text-[10px] font-medium text-(--color-text-subtle)">
          <span class="cap-dot cap-dot-available" />
          Supported (opt-in)
        </div>
        <div class="flex items-center gap-1.5 text-[10px] font-medium text-(--color-text-subtle)">
          <span class="cap-dot cap-dot-off" />
          Not supported
        </div>
      </div>

      <div class="stagger-children space-y-1.5">
        <div
          v-for="(script, index) in scriptRegistry"
          :key="index"
          class="registry-row group"
        >
          <div class="px-3.5 py-2.5 flex items-center gap-3">
            <!-- Logo -->
            <div class="w-7 h-7 rounded-lg bg-(--color-surface-sunken) border border-(--color-border-subtle) flex items-center justify-center flex-shrink-0 overflow-hidden">
              <img
                v-if="script.logo && typeof script.logo === 'string' && script.logo.startsWith('http')"
                class="w-5 h-5 object-contain"
                :src="typeof script.logo === 'object' ? script.logo.dark || script.logo.light : script.logo"
                alt=""
              >
              <div
                v-else-if="script.logo"
                class="w-5 h-5 flex items-center [&>svg]:max-h-5 [&>svg]:max-w-5"
                v-html="typeof script.logo === 'object' ? (script.logo.dark || script.logo.light) : script.logo"
              />
              <UIcon v-else name="i-carbon-script" class="text-sm text-(--color-text-subtle)" />
            </div>

            <!-- Name + Source -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-[13px] font-semibold tracking-tight truncate">{{ script.label }}</span>
                <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-(--color-surface-sunken) text-(--color-text-subtle) font-medium flex-shrink-0">{{ script.category }}</span>
              </div>
              <div v-if="script.src && script.src !== false" class="text-[10px] font-mono text-(--color-text-subtle) truncate mt-0.5">
                {{ script.src }}
              </div>
              <div v-else-if="script.src === false" class="text-[10px] font-mono text-(--color-text-subtle) mt-0.5">
                npm (no script download)
              </div>
            </div>

            <!-- Capabilities -->
            <div class="flex items-center gap-1 flex-shrink-0">
              <UTooltip v-for="cap in capabilityDefs" :key="cap.key">
                <div class="cap-indicator" :class="`cap-${capState(script, cap.key)}`">
                  <UIcon :name="cap.icon" class="text-xs" />
                </div>
                <template #content>
                  <div class="text-xs space-y-0.5">
                    <div class="font-semibold">{{ cap.label }}</div>
                    <div class="opacity-70">{{ capStateLabel(capState(script, cap.key)) }}</div>
                    <div class="opacity-50 mt-1 max-w-48 text-[11px]">{{ cap.desc }}</div>
                  </div>
                </template>
              </UTooltip>
            </div>

            <!-- Docs link -->
            <a
              :href="`https://scripts.nuxt.com/scripts/${script.label.toLowerCase().replace(/ /g, '-')}`"
              target="_blank"
              class="opacity-0 group-hover:opacity-60 transition-opacity flex-shrink-0"
              aria-label="View documentation"
            >
              <UIcon name="i-carbon-launch" class="text-sm" />
            </a>
          </div>
        </div>
      </div>

      <!-- Capability Matrix -->
      <div v-if="scriptRegistry.length > 3" class="mt-5 card overflow-hidden">
        <div class="px-4 py-2.5 border-b border-(--color-border-subtle)">
          <h4 class="text-xs font-semibold uppercase tracking-wider text-(--color-text-subtle) flex items-center gap-1.5">
            <UIcon name="i-carbon-data-table" class="text-sm" />
            Capability Matrix
          </h4>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-xs">
            <thead>
              <tr class="border-b border-(--color-border-subtle)">
                <th class="px-4 py-2 text-left font-medium text-(--color-text-subtle)">Script</th>
                <th
                  v-for="cap in capabilityDefs"
                  :key="cap.key"
                  class="px-3 py-2 text-center font-medium text-(--color-text-subtle) whitespace-nowrap"
                >
                  <UTooltip :text="cap.desc">
                    <span class="inline-flex items-center justify-center gap-1">
                      <UIcon :name="cap.icon" class="text-xs" />
                      {{ cap.label }}
                    </span>
                  </UTooltip>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="script in scriptRegistry"
                :key="script.registryKey || script.label"
                class="border-b border-(--color-border-subtle) last:border-b-0 hover:bg-(--color-surface-sunken) transition-colors"
              >
                <td class="px-4 py-2 font-medium whitespace-nowrap">
                  <div class="flex items-center gap-2">
                    <div
                      v-if="script.logo"
                      class="w-4 h-4 flex items-center [&>svg]:max-h-4 [&>svg]:max-w-4"
                      v-html="typeof script.logo === 'object' ? (script.logo.dark || script.logo.light) : script.logo"
                    />
                    <UIcon v-else name="i-carbon-script" class="text-xs text-(--color-text-subtle)" />
                    {{ script.label }}
                  </div>
                </td>
                <td v-for="cap in capabilityDefs" :key="cap.key" class="px-3 py-2 text-center">
                  <UTooltip :text="capStateLabel(capState(script, cap.key))">
                    <div class="cap-dot mx-auto" :class="`cap-dot-${capState(script, cap.key)}`" />
                  </UTooltip>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* Registry rows */
.registry-row {
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-subtle);
  background: var(--color-surface-elevated);
  transition: border-color 200ms, box-shadow 200ms;
}

.registry-row:hover {
  border-color: var(--color-border);
  box-shadow: 0 2px 12px oklch(0% 0 0 / 0.04);
}

.dark .registry-row:hover {
  box-shadow: 0 2px 12px oklch(0% 0 0 / 0.2);
}

/* Capability indicators */
.cap-indicator {
  width: 1.625rem;
  height: 1.625rem;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 150ms;
}

.cap-active {
  background: oklch(75% 0.15 145 / 0.12);
  border-color: oklch(65% 0.15 145 / 0.2);
  color: oklch(50% 0.15 145);
}
.dark .cap-active {
  background: oklch(50% 0.15 145 / 0.15);
  border-color: oklch(55% 0.12 145 / 0.2);
  color: oklch(78% 0.15 145);
}

.cap-available {
  background: oklch(80% 0.08 80 / 0.08);
  border-color: oklch(70% 0.1 80 / 0.15);
  border-style: dashed;
  color: oklch(55% 0.1 80);
}
.dark .cap-available {
  background: oklch(45% 0.06 80 / 0.1);
  border-color: oklch(60% 0.08 80 / 0.15);
  color: oklch(75% 0.08 80);
}

.cap-off {
  opacity: 0.15;
  color: var(--color-text-subtle);
}

/* Capability dots */
.cap-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  transition: all 150ms;
}

.cap-dot-active {
  background: oklch(65% 0.2 145);
  box-shadow: 0 0 4px oklch(65% 0.2 145 / 0.4);
}

.cap-dot-available {
  background: transparent;
  border: 2px dashed oklch(70% 0.12 80 / 0.6);
}

.cap-dot-off {
  background: var(--color-neutral-300);
  opacity: 0.3;
}

.dark .cap-dot-off {
  background: var(--color-neutral-600);
}
</style>
