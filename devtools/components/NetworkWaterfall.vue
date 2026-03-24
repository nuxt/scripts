<script setup lang="ts">
import { bytesToHumanReadable, msToHumanReadable } from '~/utils/formatting'

interface NetworkRequest {
  url: string
  startTime: number
  duration: number
  transferSize: number
  encodedBodySize: number
  decodedBodySize: number
  initiatorType: string
  dns: number
  connect: number
  ssl: number
  ttfb: number
  download: number
  isProxied: boolean
}

interface ProxyRoute {
  local: string
  target: string
}

const { requests, domains = [], proxyRoutes = [], privacyLevel, proxyPrefix, isFirstParty = false } = defineProps<{
  requests: NetworkRequest[]
  domains?: string[]
  proxyRoutes?: ProxyRoute[]
  privacyLevel?: 'full' | 'partial' | 'none'
  proxyPrefix?: string
  isFirstParty?: boolean
}>()

const phases = [
  { key: 'dns', label: 'DNS', color: 'oklch(70% 0.15 165)' },
  { key: 'connect', label: 'Connect', color: 'oklch(72% 0.14 75)' },
  { key: 'ssl', label: 'SSL', color: 'oklch(65% 0.15 300)' },
  { key: 'ttfb', label: 'TTFB', color: 'oklch(65% 0.13 250)' },
  { key: 'download', label: 'Download', color: 'oklch(72% 0.12 200)' },
] as const

const sorted = computed(() => [...requests].sort((a, b) => a.startTime - b.startTime))

const timeRange = computed(() => {
  if (!sorted.value.length) return { min: 0, max: 1 }
  const min = sorted.value[0].startTime
  const max = Math.max(...sorted.value.map(r => r.startTime + r.duration))
  return { min, max: max || min + 1 }
})

const totalTransfer = computed(() => requests.reduce((sum, r) => sum + r.transferSize, 0))
const totalTime = computed(() => timeRange.value.max - timeRange.value.min)
const proxiedCount = computed(() => requests.filter(r => r.isProxied).length)

const domainBreakdown = computed(() => {
  const map = new Map<string, { count: number, transfer: number, proxied: boolean }>()
  for (const req of requests) {
    const hostname = extractHostname(req.url)
    const existing = map.get(hostname) || { count: 0, transfer: 0, proxied: false }
    existing.count++
    existing.transfer += req.transferSize
    if (req.isProxied) existing.proxied = true
    map.set(hostname, existing)
  }
  return [...map.entries()]
    .sort((a, b) => b[1].transfer - a[1].transfer)
    .map(([domain, stats]) => ({
      domain,
      ...stats,
      isKnown: domains.includes(domain),
      proxyRoute: proxyRoutes.find(r => r.target.includes(domain)),
    }))
})

function extractHostname(url: string): string {
  try { return new URL(url).hostname }
  catch {
    const match = url.match(/\/_scripts\/p\/([^/]+)/)
    return match?.[1] || 'localhost'
  }
}

function barStyle(req: NetworkRequest) {
  const { min, max } = timeRange.value
  const range = max - min
  return { left: `${((req.startTime - min) / range) * 100}%`, width: `${Math.max((req.duration / range) * 100, 0.5)}%` }
}

function phaseWidth(req: NetworkRequest, phase: typeof phases[number]) {
  if (req.duration === 0) return '0%'
  const val = req[phase.key]
  return `${Math.max((val / req.duration) * 100, val > 0 ? 2 : 0)}%`
}

function shortUrl(url: string) {
  try {
    const u = new URL(url)
    const path = u.pathname + u.search
    return path.length > 50 ? `${path.slice(0, 47)}...` : path
  }
  catch { return url.length > 50 ? `${url.slice(0, 47)}...` : url }
}

function initiatorLabel(type: string) {
  const map: Record<string, string> = { script: 'Script', xmlhttprequest: 'XHR', fetch: 'Fetch', img: 'Image', css: 'Stylesheet', beacon: 'Beacon' }
  return map[type] || type
}

function initiatorIcon(type: string) {
  const map: Record<string, string> = {
    script: 'i-carbon-code', xmlhttprequest: 'i-carbon-send-alt', fetch: 'i-carbon-send-alt',
    img: 'i-carbon-image', css: 'i-carbon-paint-brush', beacon: 'i-carbon-satellite-radar',
  }
  return map[type] || 'i-carbon-document'
}

function statusCode(req: NetworkRequest) {
  return (req.transferSize === 0 && req.decodedBodySize > 0) ? 304 : 200
}
</script>

<template>
  <div v-if="!requests.length" class="panel-grids flex flex-col items-center justify-center py-8 gap-1.5 rounded-b-xl">
    <UIcon name="i-carbon-network-4" class="text-xl text-(--color-text-subtle)" />
    <p class="text-xs text-(--color-text-subtle)">Requests appear as the script loads</p>
  </div>

  <div v-else class="waterfall-container">
    <!-- Stats bar -->
    <div class="waterfall-stats">
      <span class="waterfall-stat">
        <span class="waterfall-stat-value">{{ requests.length }}</span>
        <span class="waterfall-stat-label">req</span>
      </span>
      <span class="waterfall-sep" />
      <span class="waterfall-stat">
        <span class="waterfall-stat-value">{{ bytesToHumanReadable(totalTransfer) }}</span>
      </span>
      <span class="waterfall-sep" />
      <span class="waterfall-stat">
        <span class="waterfall-stat-value">{{ msToHumanReadable(Math.round(totalTime)) }}</span>
      </span>

      <template v-if="isFirstParty && proxiedCount > 0">
        <span class="waterfall-sep" />
        <UTooltip>
          <span class="waterfall-proxied-badge">
            <UIcon name="i-carbon-security" class="text-[10px]" />
            <span class="waterfall-stat-value">{{ proxiedCount }}/{{ requests.length }}</span>
            proxied
          </span>
          <template #content>
            <div class="text-xs space-y-1 max-w-60">
              <div class="font-semibold">First-Party Proxy</div>
              <div class="opacity-70">
                {{ proxiedCount }} request{{ proxiedCount !== 1 ? 's' : '' }} routed through
                <code class="px-1 py-px rounded bg-white/10 text-[10px]">{{ proxyPrefix || '/_scripts/p' }}</code>
              </div>
              <div v-if="privacyLevel" class="opacity-70">
                Privacy: <span :class="privacyLevel === 'full' ? 'text-emerald-400' : privacyLevel === 'partial' ? 'text-amber-400' : ''">{{ privacyLevel }}</span>
              </div>
            </div>
          </template>
        </UTooltip>
      </template>

      <!-- Domain pills -->
      <template v-if="domainBreakdown.length > 1">
        <span class="waterfall-sep" />
        <div class="flex items-center gap-1">
          <UTooltip v-for="d in domainBreakdown" :key="d.domain">
            <span class="domain-pill" :class="d.proxied ? 'domain-pill-proxied' : ''">
              <UIcon v-if="d.proxied" name="i-carbon-security" class="text-[8px]" />
              {{ d.domain }}
            </span>
            <template #content>
              <div class="text-xs space-y-0.5">
                <div class="font-mono font-semibold">{{ d.domain }}</div>
                <div class="opacity-70">{{ d.count }} req &middot; {{ bytesToHumanReadable(d.transfer) }}</div>
                <div v-if="d.proxyRoute" class="opacity-60">{{ d.proxyRoute.target }} &rarr; {{ d.proxyRoute.local }}</div>
                <div v-if="d.proxied" class="text-emerald-400">Proxied through first-party</div>
              </div>
            </template>
          </UTooltip>
        </div>
      </template>
    </div>

    <!-- Waterfall table -->
    <div class="waterfall-table">
      <!-- Legend -->
      <div class="waterfall-legend">
        <div v-for="phase in phases" :key="phase.key" class="waterfall-legend-item">
          <span class="waterfall-legend-dot" :style="{ background: phase.color }" />
          {{ phase.label }}
        </div>
      </div>

      <!-- Rows -->
      <div class="waterfall-rows">
        <UTooltip v-for="(req, i) in sorted" :key="i">
          <div class="waterfall-row" :class="req.isProxied ? 'waterfall-row-proxied' : ''">
            <div
              class="waterfall-status"
              :class="statusCode(req) === 304 ? 'waterfall-status-304' : 'waterfall-status-200'"
            >
              {{ statusCode(req) }}
            </div>
            <UIcon
              :name="req.isProxied ? 'i-carbon-security' : initiatorIcon(req.initiatorType)"
              class="waterfall-row-icon"
              :class="req.isProxied ? 'waterfall-row-icon-proxied' : ''"
            />
            <div class="waterfall-url">{{ shortUrl(req.url) }}</div>
            <div class="waterfall-bar-track">
              <div class="waterfall-bar" :style="barStyle(req)">
                <div
                  v-for="phase in phases" :key="phase.key"
                  :style="{ width: phaseWidth(req, phase), background: phase.color }"
                  class="h-full"
                />
              </div>
            </div>
            <div class="waterfall-duration">{{ msToHumanReadable(Math.round(req.duration)) }}</div>
          </div>

          <template #content>
            <div class="text-xs space-y-1.5 max-w-80">
              <div class="font-mono text-[11px] break-all opacity-90">{{ req.url }}</div>
              <div class="flex items-center gap-2 opacity-70">
                <span>{{ initiatorLabel(req.initiatorType) }}</span>
                <span class="opacity-30">&middot;</span>
                <span>{{ msToHumanReadable(Math.round(req.duration)) }}</span>
                <template v-if="req.transferSize > 0">
                  <span class="opacity-30">&middot;</span>
                  <span>{{ bytesToHumanReadable(req.transferSize) }}</span>
                </template>
              </div>
              <div class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                <template v-for="phase in phases" :key="phase.key">
                  <template v-if="req[phase.key] > 0.1">
                    <div class="flex items-center gap-1 opacity-60">
                      <span class="w-1.5 h-1.5 rounded-sm inline-block" :style="{ background: phase.color }" />
                      {{ phase.label }}
                    </div>
                    <div class="tabular-nums text-right">{{ req[phase.key].toFixed(1) }}ms</div>
                  </template>
                </template>
              </div>
              <div v-if="req.isProxied" class="flex items-center gap-1 text-emerald-400">
                <UIcon name="i-carbon-security" class="text-[10px]" />
                Proxied through first-party
              </div>
            </div>
          </template>
        </UTooltip>
      </div>
    </div>
  </div>
</template>

<style scoped>
.waterfall-container {
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Stats */
.waterfall-stats {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.6875rem;
}

.waterfall-stat {
  display: inline-flex;
  align-items: baseline;
  gap: 0.25rem;
  font-variant-numeric: tabular-nums;
}

.waterfall-stat-value {
  font-weight: 700;
  color: var(--color-text);
}

.waterfall-stat-label {
  color: var(--color-text-subtle);
}

.waterfall-sep {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--color-text-subtle);
  opacity: 0.3;
}

.waterfall-proxied-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: oklch(50% 0.15 145);
}
.dark .waterfall-proxied-badge {
  color: oklch(78% 0.12 145);
}

.domain-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.125rem;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  padding: 0.0625rem 0.375rem;
  border-radius: 9999px;
  background: var(--color-surface-sunken);
  color: var(--color-text-subtle);
  border: 1px solid var(--color-border-subtle);
}

.domain-pill-proxied {
  background: oklch(75% 0.15 145 / 0.08);
  border-color: oklch(65% 0.15 145 / 0.12);
  color: oklch(50% 0.12 145);
}
.dark .domain-pill-proxied {
  background: oklch(50% 0.12 145 / 0.1);
  color: oklch(78% 0.1 145);
}

/* Table */
.waterfall-table {
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-subtle);
  overflow: hidden;
  background: var(--color-surface-elevated);
}

.waterfall-legend {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-bottom: 1px solid var(--color-border-subtle);
  background: var(--color-surface-sunken);
}

.waterfall-legend-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.5625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-subtle);
}

.waterfall-legend-dot {
  width: 5px;
  height: 5px;
  border-radius: 2px;
}

/* Rows */
.waterfall-row {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.1875rem 0.5rem;
  font-size: 0.6875rem;
  transition: background 100ms;
  cursor: default;
}

.waterfall-row:hover {
  background: var(--color-surface-sunken);
}

.waterfall-row-proxied {
  background: oklch(75% 0.15 145 / 0.03);
}
.waterfall-row-proxied:hover {
  background: oklch(75% 0.15 145 / 0.06);
}

.waterfall-status {
  flex-shrink: 0;
  width: 1.5rem;
  text-align: center;
  font-size: 0.625rem;
  font-family: var(--font-mono);
  font-weight: 600;
  line-height: 1;
  padding: 0.125rem 0;
  border-radius: 3px;
}

.waterfall-status-200 {
  color: oklch(50% 0.15 145);
  background: oklch(75% 0.15 145 / 0.1);
}
.dark .waterfall-status-200 {
  color: oklch(78% 0.12 145);
  background: oklch(50% 0.12 145 / 0.12);
}

.waterfall-status-304 {
  color: oklch(55% 0.12 80);
  background: oklch(80% 0.08 80 / 0.1);
}
.dark .waterfall-status-304 {
  color: oklch(75% 0.1 80);
  background: oklch(50% 0.06 80 / 0.12);
}

.waterfall-row-icon {
  flex-shrink: 0;
  font-size: 0.625rem;
  color: var(--color-text-subtle);
  opacity: 0.4;
}

.waterfall-row-icon-proxied {
  color: oklch(55% 0.15 145);
  opacity: 1;
}
.dark .waterfall-row-icon-proxied {
  color: oklch(78% 0.12 145);
}

.waterfall-url {
  flex-shrink: 0;
  width: 11rem;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  color: var(--color-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.waterfall-bar-track {
  flex: 1;
  height: 0.875rem;
  position: relative;
  background: var(--color-surface-sunken);
  border-radius: 3px;
  overflow: hidden;
}

.waterfall-bar {
  position: absolute;
  height: 100%;
  display: flex;
  border-radius: 3px;
  overflow: hidden;
}

.waterfall-duration {
  flex-shrink: 0;
  width: 2.5rem;
  text-align: right;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-subtle);
}
</style>
