<script setup lang="ts">
import { humanFriendlyTimestamp, urlToOrigin } from '~/utils/formatting'
import {
  formatScriptInterface,
  firstPartyData,
  getActiveTab,
  getFirstPartyScript,
  isFirstPartyScript,
  scriptErrors,
  scriptLogo,
  scriptSizes,
  scripts,
  setActiveTab,
} from '~/composables/state'

const subTabDefs = [
  { label: 'Events', value: 'events', icon: 'i-carbon-list' },
  { label: 'Network', value: 'network', icon: 'i-carbon-network-4' },
  { label: 'API', value: 'api', icon: 'i-carbon-code' },
]

function statusBadgeClass(status: string) {
  switch (status) {
    case 'loaded': return 'status-badge-loaded'
    case 'loading': return 'status-badge-loading'
    case 'awaitingLoad': return 'status-badge-awaiting'
    case 'removed':
    case 'error': return 'status-badge-error'
    case 'validation-failed': return 'status-badge-validation'
    default: return 'status-badge-default'
  }
}
</script>

<template>
  <div class="py-1">
    <div v-if="!Object.keys(scripts || {}).length" class="panel-grids rounded-xl flex flex-col items-center justify-center py-16 gap-3">
      <div class="w-12 h-12 rounded-xl bg-(--color-surface-elevated) border border-(--color-border) flex items-center justify-center">
        <UIcon name="i-carbon-script" class="text-2xl text-(--color-text-subtle)" />
      </div>
      <p class="text-sm font-medium text-(--color-text-muted)">No scripts loaded</p>
      <p class="text-xs text-(--color-text-subtle)">Scripts will appear here as they are registered</p>
    </div>

    <div class="stagger-children space-y-3">
      <div
        v-for="(script, id) in scripts"
        :key="id"
        class="card overflow-hidden"
      >
        <!-- Script header -->
        <div class="px-4 py-3 flex items-center justify-between gap-3">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-7 h-7 rounded-lg bg-(--color-surface-sunken) border border-(--color-border-subtle) flex items-center justify-center flex-shrink-0 overflow-hidden">
              <img
                v-if="scriptLogo(script) && typeof scriptLogo(script) === 'string' && scriptLogo(script).startsWith('http')"
                class="w-5 h-5 object-contain"
                :src="scriptLogo(script)"
                alt=""
              >
              <div
                v-else-if="scriptLogo(script)"
                class="w-5 h-5 flex items-center [&>svg]:max-w-5 [&>svg]:max-h-5"
                v-html="scriptLogo(script)"
              />
              <img
                v-else-if="script.src && !script.src.startsWith('/')"
                :src="`https://www.google.com/s2/favicons?domain=${urlToOrigin(script.src)}`"
                class="w-4 h-4 rounded-sm"
                alt=""
              >
              <UIcon v-else name="i-carbon-script" class="text-sm text-(--color-text-subtle)" />
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <a
                  :href="script.src"
                  target="_blank"
                  class="text-sm font-semibold tracking-tight truncate link-external"
                  :title="script.src"
                >
                  {{ script.registry?.label || script.key || script.src }}
                </a>
                <a
                  v-if="script.docs"
                  :href="script.docs"
                  target="_blank"
                  class="text-[10px] font-medium text-(--color-text-subtle) hover:text-(--color-text-muted) transition-colors"
                >
                  docs
                </a>
              </div>
            </div>
          </div>
          <UButton
            v-if="script.$script.status === 'awaitingLoad'"
            size="xs"
            color="primary"
            variant="soft"
            icon="i-carbon-play-filled-alt"
            @click="script.$script.load()"
          >
            Load
          </UButton>
          <UButton
            v-else-if="script.$script.status === 'loaded'"
            size="xs"
            color="neutral"
            variant="ghost"
            icon="i-carbon-close"
            @click="script.$script.remove()"
          >
            Remove
          </UButton>
        </div>

        <!-- Status row -->
        <div class="px-4 pb-3 flex items-center gap-2 flex-wrap">
          <ScriptStatus
            :status="script.$script.status"
            :error="scriptErrors[script.src]"
          />
          <span
            v-if="isFirstPartyScript(script.registryKey)"
            class="status-enabled"
          >
            <UIcon name="i-carbon-security" class="text-xs" />
            First-Party
          </span>
          <ScriptSize :size="scriptSizes[script.src]" />
          <ScriptLoadTime :load-time="script.loadTime" />
          <span v-if="script.loadedFrom" class="inline-flex items-center gap-1 text-[11px] text-(--color-text-subtle) font-mono">
            <svg xmlns="http://www.w3.org/2000/svg" height="10" viewBox="0 0 256 221" class="opacity-60">
              <path fill="#41B883" d="M204.8 0H256L128 220.8L0 0h97.92L128 51.2L157.44 0z" />
              <path fill="#41B883" d="m0 0l128 220.8L256 0h-51.2L128 132.48L50.56 0z" />
              <path fill="#35495E" d="M50.56 0L128 133.12L204.8 0h-47.36L128 51.2L97.92 0z" />
            </svg>
            {{ script.loadedFrom }}
          </span>
          <span
            v-for="k in Object.keys(script.registryMeta || {})"
            :key="k"
            class="text-[11px] text-(--color-text-subtle) font-mono"
          >
            {{ k }}: {{ script.registryMeta[k] }}
          </span>
        </div>

        <!-- Sub-tabs -->
        <div class="border-t border-(--color-border-subtle)">
          <div class="flex items-center border-b border-(--color-border-subtle)">
            <button
              v-for="tabOption in subTabDefs"
              :key="tabOption.value"
              class="sub-tab"
              :class="getActiveTab(script.src) === tabOption.value ? 'sub-tab-active' : ''"
              @click="setActiveTab(script.src, tabOption.value)"
            >
              <UIcon :name="tabOption.icon" class="text-xs" />
              {{ tabOption.label }}
              <span
                v-if="tabOption.value === 'network' && script.networkRequests?.length"
                class="text-[9px] px-1 py-px rounded-full bg-(--color-surface-sunken) tabular-nums font-mono"
              >{{ script.networkRequests.length }}</span>
            </button>
          </div>

          <!-- Events -->
          <div v-if="getActiveTab(script.src) === 'events'" class="p-3">
            <div v-if="!script.events?.length" class="text-xs text-(--color-text-subtle) py-2 text-center">
              No events recorded
            </div>
            <div v-else class="event-timeline">
              <div
                v-for="(event, key) in script.events"
                :key="key"
                class="event-row"
              >
                <div class="event-time">
                  {{ humanFriendlyTimestamp(event.at) }}
                </div>
                <template v-if="event.type === 'status'">
                  <div v-if="event.status === 'validation-failed'" class="flex items-center gap-2 min-w-0">
                    <span class="event-badge" :class="statusBadgeClass(event.status)">
                      {{ event.status }}
                    </span>
                    <span class="text-[11px] text-(--color-text-subtle) truncate">
                      {{ event.args.issues.map((i: any) => `${key}.${i.path?.map((i: any) => i.key).join(',')}: ${i.message}`).join(',') }}
                    </span>
                  </div>
                  <span v-else class="event-badge" :class="statusBadgeClass(event.status)">
                    {{ event.status }}
                  </span>
                </template>
                <span
                  v-else-if="event.type === 'fn-call'"
                  class="event-fn"
                >
                  <template v-if="event.args">
                    {{ `${event.fn}(${event.args?.map((a: any) => JSON.stringify(a, null, 2)).join(', ') || ''})` }}
                  </template>
                  <template v-else>
                    <span class="opacity-40">QUEUED</span> {{ event.fn }}
                  </template>
                </span>
              </div>
            </div>
          </div>

          <!-- Network -->
          <div v-else-if="getActiveTab(script.src) === 'network'">
            <NetworkWaterfall
              :requests="script.networkRequests || []"
              :domains="getFirstPartyScript(script.registryKey)?.domains"
              :proxy-routes="getFirstPartyScript(script.registryKey)?.routes"
              :privacy-level="getFirstPartyScript(script.registryKey)?.privacyLevel"
              :proxy-prefix="firstPartyData?.proxyPrefix"
              :is-first-party="isFirstPartyScript(script.registryKey)"
            />
          </div>

          <!-- API -->
          <div v-else-if="getActiveTab(script.src) === 'api'" class="p-3">
            <DevtoolsSnippet
              :code="formatScriptInterface(script.$script?.instance)"
              lang="js"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Sub-tabs */
.sub-tab {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-subtle);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color 150ms, border-color 150ms;
  cursor: pointer;
}

.sub-tab:hover {
  color: var(--color-text-muted);
}

.sub-tab-active {
  color: var(--color-text);
  border-bottom-color: var(--seo-green);
}

/* Event timeline */
.event-timeline {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.event-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.25rem 0.375rem;
  border-radius: var(--radius-sm);
  font-size: 0.6875rem;
  transition: background 100ms;
}

.event-row:hover {
  background: var(--color-surface-sunken);
}

.event-time {
  color: var(--color-text-subtle);
  font-family: var(--font-mono);
  font-size: 0.625rem;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  min-width: 5.5rem;
}

.event-badge {
  display: inline-flex;
  padding: 0.0625rem 0.375rem;
  border-radius: 9999px;
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  white-space: nowrap;
}

.event-fn {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  padding: 0.0625rem 0.5rem;
  border-radius: var(--radius-sm);
  background: var(--color-surface-sunken);
  color: var(--color-text-muted);
  border: 1px solid var(--color-border-subtle);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Status badge colors */
.status-badge-loaded {
  background: oklch(75% 0.15 145 / 0.12);
  color: oklch(45% 0.15 145);
}
.dark .status-badge-loaded {
  background: oklch(50% 0.15 145 / 0.15);
  color: oklch(78% 0.15 145);
}

.status-badge-loading {
  background: oklch(80% 0.08 80 / 0.12);
  color: oklch(55% 0.12 80);
}
.dark .status-badge-loading {
  background: oklch(45% 0.06 80 / 0.15);
  color: oklch(75% 0.1 80);
}

.status-badge-awaiting {
  background: var(--color-surface-sunken);
  color: var(--color-text-muted);
}

.status-badge-error {
  background: oklch(65% 0.12 25 / 0.1);
  color: oklch(50% 0.15 25);
}
.dark .status-badge-error {
  background: oklch(45% 0.1 25 / 0.15);
  color: oklch(72% 0.12 25);
}

.status-badge-validation {
  background: oklch(70% 0.1 300 / 0.1);
  color: oklch(50% 0.12 300);
}
.dark .status-badge-validation {
  background: oklch(40% 0.08 300 / 0.15);
  color: oklch(75% 0.1 300);
}

.status-badge-default {
  background: var(--color-surface-sunken);
  color: var(--color-text-subtle);
}
</style>
