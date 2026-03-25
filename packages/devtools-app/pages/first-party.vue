<script setup lang="ts">
import { reactive } from 'vue'
import { firstPartyData } from '~/composables/state'

const privacyFlags = ['ip', 'userAgent', 'language', 'screen', 'timezone', 'hardware'] as const
const privacyFlagLabels: Record<string, string> = {
  ip: 'IP Address',
  userAgent: 'User Agent',
  language: 'Language',
  screen: 'Screen',
  timezone: 'Timezone',
  hardware: 'Hardware',
}
const privacyFlagShort: Record<string, string> = {
  ip: 'IP',
  userAgent: 'UA',
  language: 'Lang',
  screen: 'Screen',
  timezone: 'TZ',
  hardware: 'HW',
}
const privacyFlagIcons: Record<string, string> = {
  ip: 'i-carbon-location',
  userAgent: 'i-carbon-user-profile',
  language: 'i-carbon-translate',
  screen: 'i-carbon-screen',
  timezone: 'i-carbon-time',
  hardware: 'i-carbon-chip',
}
const expandedRoutes = reactive<Record<string, boolean>>({})

function toggleRoutes(key: string) {
  expandedRoutes[key] = !expandedRoutes[key]
}

function privacyLevelClass(level: string) {
  if (level === 'full')
    return 'privacy-full'
  if (level === 'partial')
    return 'privacy-partial'
  return 'privacy-none'
}

function mechanismClass(m: string) {
  return m === 'bundle-rewrite-intercept' ? 'mechanism-bundle' : 'mechanism-config'
}

function mechanismLabel(m: string) {
  return m === 'bundle-rewrite-intercept' ? 'Bundle + Rewrite' : 'Config Injection'
}
</script>

<template>
  <div class="py-1">
    <!-- Disabled state -->
    <div v-if="!firstPartyData?.enabled" class="panel-grids rounded-xl flex flex-col items-center justify-center py-16 gap-4">
      <div class="w-14 h-14 rounded-2xl bg-(--color-surface-elevated) border border-(--color-border) flex items-center justify-center">
        <UIcon name="i-carbon-security" class="text-3xl text-(--color-text-subtle)" />
      </div>
      <div class="text-center space-y-1.5">
        <p class="text-sm font-semibold text-(--color-text-muted)">
          First-Party Mode is not enabled
        </p>
        <p class="text-xs text-(--color-text-subtle) max-w-sm">
          Proxy is auto-enabled when scripts with proxy capabilities are configured.
        </p>
      </div>
      <div class="hint-callout text-xs max-w-sm">
        <UIcon name="i-carbon-information" class="hint-callout-icon text-base flex-shrink-0" />
        <div>
          Ensure <code class="px-1 py-0.5 rounded text-[11px] font-mono bg-(--color-surface-sunken)">scripts: { proxy: false }</code> is not set in your config.
        </div>
      </div>
      <a
        href="https://scripts.nuxt.com/docs/guides/first-party"
        target="_blank"
        class="link-external text-xs mt-1"
      >
        View Documentation
      </a>
    </div>

    <!-- Enabled state -->
    <div v-else class="stagger-children space-y-4">
      <!-- Stats row -->
      <div class="flex flex-wrap gap-2.5">
        <div class="stat-card">
          <div class="stat-label">
            Status
          </div>
          <div class="flex items-center gap-1.5">
            <span class="stat-dot stat-dot-active" />
            <span class="text-sm font-semibold" style="color: oklch(55% 0.18 145);">Active</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">
            Scripts
          </div>
          <div class="stat-value">
            {{ firstPartyData.scripts.length }}
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">
            Routes
          </div>
          <div class="stat-value">
            {{ firstPartyData.totalRoutes }}
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">
            Domains
          </div>
          <div class="stat-value">
            {{ firstPartyData.totalDomains }}
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">
            Privacy
          </div>
          <div class="stat-value capitalize text-sm">
            {{ firstPartyData.privacyMode }}
          </div>
        </div>
      </div>

      <!-- Proxy prefix -->
      <div class="flex items-center gap-2 text-xs text-(--color-text-subtle)">
        <UIcon name="i-carbon-direction-fork" class="text-sm" />
        Proxy prefix:
        <code class="px-1.5 py-0.5 rounded text-[11px] font-mono bg-(--color-surface-sunken) border border-(--color-border-subtle) text-(--color-text-muted)">
          {{ firstPartyData.proxyPrefix }}
        </code>
      </div>

      <!-- Script cards -->
      <div class="space-y-3">
        <div
          v-for="s in firstPartyData.scripts"
          :key="s.registryKey"
          class="card overflow-hidden"
        >
          <div class="p-4">
            <div class="flex items-start justify-between gap-4">
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="w-7 h-7 rounded-lg bg-(--color-surface-sunken) border border-(--color-border-subtle) flex items-center justify-center flex-shrink-0 overflow-hidden">
                  <div
                    v-if="s.logo"
                    class="w-5 h-5 flex items-center justify-center [&>svg]:max-w-5 [&>svg]:max-h-5"
                    v-html="s.logo"
                  />
                  <UIcon v-else name="i-carbon-script" class="text-sm text-(--color-text-subtle)" />
                </div>
                <div>
                  <span class="text-sm font-semibold tracking-tight">{{ s.label }}</span>
                  <span class="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-(--color-surface-sunken) text-(--color-text-subtle) font-medium">{{ s.category }}</span>
                </div>
              </div>
              <!-- Privacy flags -->
              <div class="flex gap-0.5 flex-shrink-0">
                <UTooltip
                  v-for="flag in privacyFlags"
                  :key="flag"
                  :text="`${privacyFlagLabels[flag]}: ${s.privacy[flag] ? 'Anonymized' : 'Passthrough'}`"
                >
                  <div class="privacy-flag" :class="s.privacy[flag] ? 'privacy-flag-on' : 'privacy-flag-off'">
                    <UIcon :name="privacyFlagIcons[flag]" class="text-xs" />
                  </div>
                </UTooltip>
              </div>
            </div>

            <!-- Badges -->
            <div class="flex items-center gap-1.5 mt-2.5 flex-wrap">
              <span class="fp-badge" :class="mechanismClass(s.mechanism)">
                {{ mechanismLabel(s.mechanism) }}
              </span>
              <span class="fp-badge" :class="privacyLevelClass(s.privacyLevel)">
                {{ s.privacyLevel === 'full' ? 'Full Privacy' : s.privacyLevel === 'partial' ? 'Partial' : 'Passthrough' }}
              </span>
              <span v-if="s.hasAutoInject" class="fp-badge fp-badge-info">
                Auto-inject{{ s.autoInjectField ? `: ${s.autoInjectField}` : '' }}
              </span>
              <span v-if="s.canvasFingerprinting" class="fp-badge fp-badge-warn">
                Canvas FP neutralized
              </span>
              <span v-if="s.hasPostProcess" class="fp-badge fp-badge-muted">
                Post-process
              </span>
            </div>
          </div>

          <!-- Domains -->
          <div v-if="s.domains.length" class="px-4 pb-3 flex items-center gap-1.5 flex-wrap">
            <span class="text-[10px] text-(--color-text-subtle) mr-0.5">Proxying:</span>
            <span
              v-for="d in s.domains" :key="d"
              class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-(--color-surface-sunken) text-(--color-text-muted) border border-(--color-border-subtle)"
            >{{ d }}</span>
          </div>

          <!-- Routes -->
          <div v-if="s.routes.length" class="border-t border-(--color-border-subtle)">
            <button
              class="w-full px-4 py-2 flex items-center justify-between text-xs text-(--color-text-subtle) hover:text-(--color-text-muted) transition-colors cursor-pointer"
              @click="toggleRoutes(s.registryKey)"
            >
              <span class="flex items-center gap-1.5">
                <UIcon name="i-carbon-arrows-horizontal" class="text-xs" />
                {{ s.routes.length }} route{{ s.routes.length > 1 ? 's' : '' }}
                <span v-if="s.interceptRules.length" class="opacity-50">
                  &middot; {{ s.interceptRules.length }} intercept rule{{ s.interceptRules.length > 1 ? 's' : '' }}
                </span>
              </span>
              <UIcon
                :name="expandedRoutes[s.registryKey] ? 'i-carbon-chevron-up' : 'i-carbon-chevron-down'"
                class="text-xs transition-transform"
              />
            </button>
            <div v-show="expandedRoutes[s.registryKey]">
              <div class="border-t border-(--color-border-subtle)">
                <div
                  v-for="(r, ri) in s.routes" :key="ri"
                  class="px-4 py-1.5 flex items-center gap-2 text-[11px] font-mono hover:bg-(--color-surface-sunken) transition-colors"
                >
                  <span style="color: oklch(55% 0.12 250);" class="min-w-0 truncate">{{ r.local }}</span>
                  <UIcon name="i-carbon-arrow-right" class="text-[9px] opacity-25 flex-shrink-0" />
                  <span class="text-(--color-text-subtle) min-w-0 truncate">{{ r.target }}</span>
                </div>
              </div>
              <div v-if="s.interceptRules.length" class="border-t border-(--color-border-subtle) px-4 py-2">
                <div class="text-[10px] uppercase tracking-wider text-(--color-text-subtle) mb-1 font-medium">
                  Intercept Rules
                </div>
                <div
                  v-for="(ir, iri) in s.interceptRules" :key="iri"
                  class="py-1 flex items-center gap-2 text-[11px] font-mono"
                >
                  <span style="color: oklch(55% 0.12 300);" class="truncate">{{ ir.pattern }}{{ ir.pathPrefix }}</span>
                  <UIcon name="i-carbon-arrow-right" class="text-[9px] opacity-25 flex-shrink-0" />
                  <span class="text-(--color-text-subtle) truncate">{{ ir.target }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Privacy Matrix -->
      <div v-if="firstPartyData.scripts.length > 1" class="card overflow-hidden">
        <div class="px-4 py-2.5 border-b border-(--color-border-subtle)">
          <h4 class="text-xs font-semibold uppercase tracking-wider text-(--color-text-subtle) flex items-center gap-1.5">
            <UIcon name="i-carbon-data-table" class="text-sm" />
            Privacy Matrix
          </h4>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-xs">
            <thead>
              <tr class="border-b border-(--color-border-subtle)">
                <th class="px-4 py-2 text-left font-medium text-(--color-text-subtle)">
                  Script
                </th>
                <th
                  v-for="flag in privacyFlags" :key="flag"
                  class="px-2.5 py-2 text-center font-medium text-(--color-text-subtle) whitespace-nowrap"
                >
                  {{ privacyFlagShort[flag] }}
                </th>
                <th class="px-2.5 py-2 text-center font-medium text-(--color-text-subtle)">
                  Level
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="s in firstPartyData.scripts" :key="s.registryKey"
                class="border-b border-(--color-border-subtle) last:border-b-0 hover:bg-(--color-surface-sunken) transition-colors"
              >
                <td class="px-4 py-2 font-medium whitespace-nowrap">
                  {{ s.label }}
                </td>
                <td v-for="flag in privacyFlags" :key="flag" class="px-2.5 py-2 text-center">
                  <div
                    class="w-2.5 h-2.5 rounded-full mx-auto"
                    :class="s.privacy[flag] ? 'matrix-dot-on' : 'matrix-dot-off'"
                  />
                </td>
                <td class="px-2.5 py-2 text-center">
                  <span class="fp-badge text-[10px]" :class="privacyLevelClass(s.privacyLevel)">
                    {{ s.privacyLevel }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="text-center pt-1 pb-3">
        <a
          href="https://scripts.nuxt.com/docs/guides/first-party"
          target="_blank"
          class="link-external text-xs"
        >
          First-Party Mode Documentation
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Stat cards */
.stat-card {
  flex: 1;
  min-width: 5.5rem;
  padding: 0.625rem 0.875rem;
  border-radius: var(--radius-md);
  background: var(--color-surface-elevated);
  border: 1px solid var(--color-border);
  transition: border-color 200ms;
}

.stat-card:hover {
  border-color: var(--color-neutral-300);
}
.dark .stat-card:hover {
  border-color: var(--color-neutral-700);
}

.stat-label {
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-subtle);
  margin-bottom: 0.125rem;
}

.stat-value {
  font-size: 1.125rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: var(--color-text);
}

.stat-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.stat-dot-active {
  background: oklch(65% 0.2 145);
  box-shadow: 0 0 8px oklch(65% 0.2 145 / 0.5);
  animation: pulse-dot 2s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* Privacy flags */
.privacy-flag {
  width: 1.625rem;
  height: 1.625rem;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 150ms;
}

.privacy-flag-on {
  background: oklch(75% 0.15 145 / 0.12);
  color: oklch(50% 0.15 145);
}
.dark .privacy-flag-on {
  background: oklch(50% 0.15 145 / 0.15);
  color: oklch(78% 0.15 145);
}

.privacy-flag-off {
  background: var(--color-surface-sunken);
  color: var(--color-text-subtle);
  opacity: 0.5;
}

/* First-party badges */
.fp-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.0625rem 0.4375rem;
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  border-radius: 9999px;
  border: 1px solid transparent;
  white-space: nowrap;
}

.privacy-full {
  background: oklch(75% 0.15 145 / 0.1);
  border-color: oklch(65% 0.15 145 / 0.15);
  color: oklch(45% 0.15 145);
}
.dark .privacy-full {
  background: oklch(50% 0.15 145 / 0.12);
  border-color: oklch(55% 0.12 145 / 0.2);
  color: oklch(78% 0.12 145);
}

.privacy-partial {
  background: oklch(80% 0.1 80 / 0.1);
  border-color: oklch(70% 0.1 80 / 0.15);
  color: oklch(50% 0.12 80);
}
.dark .privacy-partial {
  background: oklch(45% 0.06 80 / 0.12);
  border-color: oklch(55% 0.06 80 / 0.15);
  color: oklch(75% 0.1 80);
}

.privacy-none {
  background: oklch(65% 0.12 25 / 0.08);
  border-color: oklch(60% 0.12 25 / 0.12);
  color: oklch(50% 0.12 25);
}
.dark .privacy-none {
  background: oklch(45% 0.1 25 / 0.12);
  border-color: oklch(50% 0.08 25 / 0.15);
  color: oklch(72% 0.1 25);
}

.mechanism-bundle {
  background: oklch(70% 0.1 300 / 0.08);
  border-color: oklch(60% 0.1 300 / 0.12);
  color: oklch(48% 0.12 300);
}
.dark .mechanism-bundle {
  background: oklch(40% 0.08 300 / 0.12);
  border-color: oklch(50% 0.08 300 / 0.15);
  color: oklch(75% 0.1 300);
}

.mechanism-config {
  background: oklch(75% 0.08 220 / 0.08);
  border-color: oklch(65% 0.08 220 / 0.12);
  color: oklch(48% 0.1 220);
}
.dark .mechanism-config {
  background: oklch(40% 0.06 220 / 0.12);
  border-color: oklch(50% 0.06 220 / 0.15);
  color: oklch(75% 0.08 220);
}

.fp-badge-info {
  background: oklch(75% 0.1 250 / 0.08);
  border-color: oklch(65% 0.1 250 / 0.12);
  color: oklch(48% 0.12 250);
}
.dark .fp-badge-info {
  background: oklch(40% 0.08 250 / 0.12);
  color: oklch(75% 0.1 250);
}

.fp-badge-warn {
  background: oklch(80% 0.1 60 / 0.1);
  border-color: oklch(70% 0.1 60 / 0.12);
  color: oklch(50% 0.12 60);
}
.dark .fp-badge-warn {
  background: oklch(45% 0.06 60 / 0.12);
  color: oklch(75% 0.1 60);
}

.fp-badge-muted {
  background: var(--color-surface-sunken);
  border-color: var(--color-border-subtle);
  color: var(--color-text-subtle);
}

/* Matrix dots */
.matrix-dot-on {
  background: oklch(65% 0.2 145);
  box-shadow: 0 0 4px oklch(65% 0.2 145 / 0.4);
}

.matrix-dot-off {
  background: var(--color-neutral-300);
}
.dark .matrix-dot-off {
  background: var(--color-neutral-700);
}
</style>
