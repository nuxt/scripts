<script lang="ts" setup>
import { onDevtoolsClientConnected } from '@nuxt/devtools-kit/iframe-client'
import { registry } from '../src/registry'
import { devtools, fetchScript, humanFriendlyTimestamp, reactive, ref, urlToOrigin } from '#imports'
import { msToHumanReadable } from '~/utils/formatting'
import { loadShiki } from './composables/shiki'

await loadShiki()

const scriptRegistry = await registry()

const scripts = ref<Record<string, any>>({})
const scriptSizes = reactive<Record<string, string>>({})
const scriptErrors = reactive<Record<string, string>>({})
const scriptTabs = reactive<Record<string, string>>({})

function getActiveTab(scriptSrc: string) {
  return scriptTabs[scriptSrc] || 'events'
}

function setActiveTab(scriptSrc: string, tab: string) {
  scriptTabs[scriptSrc] = tab
}

function formatFunctionSignature(name: string, func: (...args: any[]) => any): string {
  const funcStr = func.toString()

  // Extract parameter list with better parsing
  const paramMatch = funcStr.match(/\(([^)]*)\)/)
  const params = paramMatch?.[1]?.trim() || ''

  // Format parameters with TypeScript-style types
  const formattedParams = params
    ? params.split(',').map((param, index) => {
        const trimmed = param.trim()
        if (!trimmed) return ''

        // If parameter already has type annotation, keep it
        if (trimmed.includes(':')) return trimmed

        // Otherwise add generic parameter names and any type
        const paramName = trimmed || `param${index + 1}`
        return `${paramName}: any`
      }).filter(Boolean).join(', ')
    : ''

  // Determine return type based on function content or name patterns
  let returnType = 'any'

  // Common return type patterns
  if (name.startsWith('is') || name.startsWith('has') || name.startsWith('can')) {
    returnType = 'boolean'
  }
  else if (name.startsWith('get') && name.includes('Element')) {
    returnType = 'HTMLElement | null'
  }
  else if (name.includes('async') || funcStr.includes('async') || funcStr.includes('Promise')) {
    returnType = 'Promise<any>'
  }
  else if (name.startsWith('on') || name.includes('listen') || name.includes('subscribe')) {
    returnType = 'void'
  }

  return `${name}(${formattedParams}): ${returnType}`
}

function formatPropertySignature(name: string, value: any): string {
  let type = typeof value

  if (value === null) {
    type = 'null'
  }
  else if (Array.isArray(value)) {
    // Try to infer array element type
    if (value.length > 0) {
      const firstElementType = typeof value[0]
      const allSameType = value.every(item => typeof item === firstElementType)
      if (allSameType) {
        type = `${firstElementType}[]`
      }
      else {
        type = 'any[]'
      }
    }
    else {
      type = 'any[]'
    }
  }
  else if (type === 'object') {
    // Check for common object patterns
    if (value.constructor && value.constructor.name !== 'Object') {
      type = value.constructor.name
    }
    else {
      // Generic object type
      type = 'object'
    }
  }
  else if (type === 'function') {
    type = 'Function'
  }

  return `${name}: ${type}`
}

function formatScriptInterface(instance: any): string {
  if (!instance || typeof instance !== 'object') {
    return 'interface ScriptInstance {\n  // No API available\n}'
  }

  const members: string[] = []

  Object.entries(instance).forEach(([key, value]) => {
    if (typeof value === 'function') {
      members.push(`  ${formatFunctionSignature(key, value as (...args: any[]) => any)}`)
    }
    else {
      members.push(`  ${formatPropertySignature(key, value)}`)
    }
  })

  if (members.length === 0) {
    return 'interface ScriptInstance {\n  // No API available\n}'
  }

  return `interface ScriptInstance {\n${members.join('\n')}\n}`
}

function syncScripts(_scripts: any[]) {
  if (!_scripts || typeof _scripts !== 'object') {
    scripts.value = {}
    return
  }
  // augment the scripts with registry
  scripts.value = Object.fromEntries(
    Object.entries({ ..._scripts })
      .map(([key, script]: [string, any]) => {
        script.registry = scriptRegistry.find(s => titleToCamelCase(s.label) === script.registryKey)
        if (script.registry) {
          const kebabCaseLabel = script.registry.label.toLowerCase().replace(/ /g, '-')
          script.docs = `https://scripts.nuxt.com/scripts/${script.registry.category}/${kebabCaseLabel}`
        }
        const loadingAt = script.events?.find((e: any) => e.status === 'loading')?.at || 0
        const loadedAt = script.events?.find((e: any) => e.status === 'loaded')?.at || 0
        if (loadingAt && loadedAt) {
          script.loadTime = msToHumanReadable(loadedAt - loadingAt)
        }
        const scriptSizeKey = script.src
        if (!scriptSizes[scriptSizeKey] && script.src) {
          fetchScript(script.src)
            .then((res) => {
              if (res.size) {
                scriptSizes[scriptSizeKey] = res.size
                script.size = res.size
              }
              if (res.error) {
                scriptErrors[scriptSizeKey] = res.error
                script.error = res.error
              }
            })
        }
        return [key, script]
      }),
  )
}

function titleToCamelCase(s: string) {
  // needs to replace empty spaces with uppercase
  return s.replace(/([\s_-])+/g, ' ').split(' ').map((w, i) => {
    if (i === 0) return w.toLowerCase()
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  }).join('')
}

const version = ref(null)
onDevtoolsClientConnected(async (client) => {
  devtools.value = client.devtools
  client.host.nuxt.hooks.hook('scripts:updated', (ctx) => {
    syncScripts(ctx.scripts)
  })
  version.value = client.host.nuxt.$config.public['nuxt-scripts'].version
  syncScripts(client.host.nuxt._scripts || {})
})
const tab = ref('scripts')

function viewDocs(docs: string) {
  tab.value = 'docs'
  setTimeout(() => {
    const iframe = document.querySelector('iframe')
    if (iframe) {
      iframe.src = docs
    }
  }, 100)
}
</script>

<template>
  <div class="relative n-bg-base flex flex-col">
    <header class="sticky top-0 z-2 px-4 pt-4 bg-background/80 backdrop-blur-lg">
      <div class="flex justify-between items-start" mb2>
        <div class="flex space-x-5">
          <h1 text-xl flex items-center gap-2>
            <a
              href="https://scripts.nuxt.com" target="_blank"
              class="flex items-end gap-1.5 font-semibold text-xl dark:text-white font-title"
            >
              <svg
                height="22" color="text-black dark:text-white" viewBox="0 0 1467 238" fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M377 200C379.16 200 381 198.209 381 196V103C381 103 386 112 395 127L434 194C435.785 197.74 439.744 200 443 200H470V50H443C441.202 50 439 51.4941 439 54V148L421 116L385 55C383.248 51.8912 379.479 50 376 50H350V200H377Z"
                  fill="currentColor"
                />
                <path
                  d="M726 92H739C742.314 92 745 89.3137 745 86V60H773V92H800V116H773V159C773 169.5 778.057 174 787 174H800V200H783C759.948 200 745 185.071 745 160V116H726V92Z"
                  fill="currentColor"
                />
                <path
                  d="M591 92V154C591 168.004 585.742 179.809 578 188C570.258 196.191 559.566 200 545 200C530.434 200 518.742 196.191 511 188C503.389 179.809 498 168.004 498 154V92H514C517.412 92 520.769 92.622 523 95C525.231 97.2459 526 98.5652 526 102V154C526 162.059 526.457 167.037 530 171C533.543 174.831 537.914 176 545 176C552.217 176 555.457 174.831 559 171C562.543 167.037 563 162.059 563 154V102C563 98.5652 563.769 96.378 566 94C567.96 91.9107 570.028 91.9599 573 92C573.411 92.0055 574.586 92 575 92H591Z"
                  fill="currentColor"
                />
                <path
                  d="M676 144L710 92H684C680.723 92 677.812 93.1758 676 96L660 120L645 97C643.188 94.1758 639.277 92 636 92H611L645 143L608 200H634C637.25 200 640.182 196.787 642 194L660 167L679 195C680.818 197.787 683.75 200 687 200H713L676 144Z"
                  fill="currentColor"
                />
                <path
                  d="M168 200H279C282.542 200 285.932 198.756 289 197C292.068 195.244 295.23 193.041 297 190C298.77 186.959 300.002 183.51 300 179.999C299.998 176.488 298.773 173.04 297 170.001L222 41C220.23 37.96 218.067 35.7552 215 34C211.933 32.2448 207.542 31 204 31C200.458 31 197.067 32.2448 194 34C190.933 35.7552 188.77 37.96 187 41L168 74L130 9.99764C128.228 6.95784 126.068 3.75491 123 2C119.932 0.245087 116.542 0 113 0C109.458 0 106.068 0.245087 103 2C99.9323 3.75491 96.7717 6.95784 95 9.99764L2 170.001C0.226979 173.04 0.00154312 176.488 1.90993e-06 179.999C-0.0015393 183.51 0.229648 186.959 2 190C3.77035 193.04 6.93245 195.244 10 197C13.0675 198.756 16.4578 200 20 200H90C117.737 200 137.925 187.558 152 164L186 105L204 74L259 168H186L168 200ZM89 168H40L113 42L150 105L125.491 147.725C116.144 163.01 105.488 168 89 168Z"
                  fill="#00DC82"
                />
                <path
                  d="M893.083 200C882.767 200 873.691 198.288 865.856 194.368C858.021 190.319 851.818 184.701 847.248 177.516C842.808 170.2 840.392 161.708 840 152.041H868.207C868.86 159.096 871.341 164.648 875.65 168.698C880.09 172.747 885.901 174.772 893.083 174.772C899.743 174.772 905.032 173.401 908.95 170.657C912.998 167.914 915.022 163.995 915.022 158.9C915.022 155.372 913.847 152.564 911.496 150.473C909.276 148.252 906.468 146.554 903.073 145.378C899.678 144.203 894.846 142.831 888.578 141.263C879.307 139.042 871.667 136.691 865.66 134.209C859.784 131.596 854.691 127.481 850.382 121.863C846.072 116.245 843.918 108.538 843.918 98.7396C843.918 91.2931 845.942 84.6305 849.99 78.7516C854.038 72.8728 859.653 68.3004 866.836 65.0344C874.018 61.6377 882.179 59.9394 891.32 59.9394C901.114 59.9394 909.733 61.7031 917.177 65.2303C924.751 68.7576 930.627 73.7873 934.806 80.3193C939.115 86.8514 941.4 94.4285 941.662 103.051H913.651C913.128 97.5639 910.908 93.2527 906.991 90.1174C903.073 86.8513 897.85 85.2183 891.32 85.2183C885.575 85.2183 881.004 86.4594 877.609 88.9416C874.214 91.4238 872.516 94.6898 872.516 98.7396C872.516 102.528 873.691 105.533 876.042 107.754C878.392 109.975 881.396 111.738 885.052 113.045C888.709 114.221 893.736 115.527 900.135 116.964C909.537 119.185 917.177 121.471 923.053 123.823C928.929 126.174 933.957 130.159 938.136 135.776C942.445 141.263 944.6 148.84 944.6 158.508C944.6 166.999 942.445 174.38 938.136 180.651C933.826 186.922 927.754 191.756 919.919 195.152C912.214 198.549 903.269 200 893.083 200Z"
                  fill="#00DC82"
                />
                <path
                  d="M1005.43 200C995.507 200 986.519 198.026 978.684 193.585C970.98 189.143 964.973 183.068 960.663 175.36C956.485 167.522 954.395 158.834 954.395 149.298C954.395 139.761 956.485 131.138 960.663 123.431C964.973 115.592 970.98 109.452 978.684 105.01C986.519 100.569 995.399 98.3477 1005.32 98.3477C1013.94 98.3477 1021.78 99.9807 1028.83 103.247C1036.01 106.513 1041.76 111.085 1046.07 116.964C1050.51 122.843 1052.99 129.505 1053.51 136.952H1026.09C1025.3 132.51 1023.02 128.852 1019.23 125.978C1015.44 123.104 1011.07 121.667 1006.11 121.667C998.925 121.667 993.245 124.215 989.066 129.31C984.887 134.404 982.798 141.067 982.798 149.298C982.798 157.528 984.887 164.191 989.066 169.285C993.375 174.25 999.186 176.732 1006.5 176.732C1011.46 176.732 1015.77 175.36 1019.43 172.617C1023.08 169.873 1025.43 166.281 1026.48 161.839H1054.29C1053.38 169.024 1050.64 175.556 1046.07 181.435C1041.5 187.314 1035.62 191.952 1028.44 195.348C1021.39 198.614 1013.79 200 1005.43 200Z"
                  fill="#00DC82"
                />
                <path
                  d="M1115.15 122.647C1108.62 122.647 1103.72 125.129 1100.46 130.093C1097.2 135.058 1095.56 141.916 1095.56 150.669V200H1068.14V99.9154H1095.56V116.376C1098.17 110.367 1101.37 106.121 1105.16 103.639C1109.08 101.156 1114.11 99.9154 1120.24 99.9154H1131.41V122.647H1115.15Z"
                  fill="#00DC82"
                />
                <path
                  d="M1171.5 200H1144.08V99.9154H1171.5V200ZM1143.3 85.8062V58H1172.29V85.8062H1143.3Z"
                  fill="#00DC82"
                />
                <path
                  d="M1193.09 238V99.9154H1220.32V110.693C1223.32 106.774 1227.24 103.769 1232.07 101.679C1236.9 99.4582 1242.45 98.3477 1248.72 98.3477C1257.86 98.3477 1265.82 100.438 1272.62 104.618C1279.41 108.799 1284.63 114.743 1288.29 122.451C1292.07 130.159 1293.97 139.108 1293.97 149.298C1293.97 159.487 1291.94 168.436 1287.89 176.144C1283.98 183.721 1278.43 189.665 1271.24 193.977C1264.06 198.157 1255.73 200 1246.33 200C1240.72 200 1235.66 199.333 1231.09 197.504C1226.52 195.675 1222.93 193.127 1220.32 189.861V238H1193.09ZM1243.04 176.732C1250.22 176.732 1256.03 174.25 1260.47 169.285C1264.91 164.191 1267.13 157.528 1267.13 149.298C1267.13 140.937 1264.91 134.274 1260.47 129.31C1256.03 124.215 1250.22 121.667 1243.04 121.667C1235.72 121.667 1229.85 124.215 1225.41 129.31C1220.97 134.274 1218.75 140.937 1218.75 149.298C1218.75 157.528 1220.97 164.191 1225.41 169.285C1229.85 174.25 1235.72 176.732 1243.04 176.732Z"
                  fill="#00DC82"
                />
                <path
                  d="M1319.6 70.7172H1346.83V99.9154H1373.27V122.647H1346.83V163C1346.83 172.406 1351.46 177.109 1360.74 177.109H1373.27V200.037H1357.01C1345.52 200.037 1336.38 196.901 1329.59 190.63C1322.93 184.36 1319.6 175.541 1319.6 164.176V122.647H1300.6V99.9154H1319.6V70.7172Z"
                  fill="#00DC82"
                />
                <path
                  d="M1428.61 200C1416.46 200 1406.6 197.112 1399.03 190.841C1391.59 184.44 1387.6 175.948 1387.08 165.366H1410.59C1411.11 169.808 1412.94 173.335 1416.07 175.948C1419.34 178.43 1423.51 179.671 1428.61 179.671C1432.79 179.671 1436.18 178.757 1438.79 176.928C1441.54 175.099 1442.91 172.813 1442.91 170.069C1442.91 166.411 1441.34 163.864 1438.21 162.427C1435.07 160.99 1430.11 159.683 1423.32 158.508C1416.27 157.201 1410.52 155.764 1406.08 154.197C1401.64 152.629 1397.79 149.82 1394.52 145.77C1391.39 141.59 1389.82 135.711 1389.82 128.134C1389.82 122.386 1391.33 117.291 1394.33 112.849C1397.46 108.276 1401.71 104.749 1407.06 102.267C1412.41 99.6541 1418.42 98.3477 1425.08 98.3477C1436.97 98.3477 1446.56 101.287 1453.88 107.166C1461.32 113.045 1465.3 120.818 1465.82 130.485H1442.12C1441.6 126.435 1439.71 123.3 1436.44 121.079C1433.31 118.728 1429.78 117.552 1425.87 117.552C1421.95 117.552 1418.81 118.401 1416.46 120.099C1414.11 121.798 1412.94 124.149 1412.94 127.154C1412.94 130.812 1414.44 133.294 1417.44 134.6C1420.58 135.776 1425.47 136.821 1432.13 137.736C1439.32 138.781 1445.19 140.087 1449.76 141.655C1454.46 143.092 1458.51 145.966 1461.91 150.277C1465.3 154.588 1467 160.859 1467 169.09C1467 178.496 1463.47 186.073 1456.42 191.821C1449.5 197.439 1440.23 200 1428.61 200Z"
                  fill="#00DC82"
                />
              </svg>
            </a>
            <NBadge class="text-sm">
              v{{ version || '' }}
            </NBadge>
          </h1>
        </div>
        <div class="flex items-center space-x-3 text-xl">
          <fieldset
            class="n-select-tabs flex flex-inline flex-wrap items-center border n-border-base rounded-lg n-bg-base"
          >
            <label
              v-for="(value, idx) of ['scripts', 'registry', 'docs']"
              :key="idx"
              class="relative n-border-base hover:n-bg-active cursor-pointer"
              :class="[
                idx ? 'border-l n-border-base ml--1px' : '',
                value === tab ? 'n-bg-active' : '',
              ]"
            >
              <div v-if="value === 'scripts'" :class="[value === tab ? '' : 'op35']">
                <VTooltip>
                  <div class="px-5 py-2">
                    <h2 text-lg flex items-center>
                      <NIcon icon="carbon:script opacity-50" />
                    </h2>
                  </div>
                  <template #popper>
                    Scripts
                  </template>
                </VTooltip>
              </div>
              <div v-else-if="value === 'registry'" :class="[value === tab ? '' : 'op35']">
                <VTooltip>
                  <div class="px-5 py-2">
                    <h2 text-lg flex items-center>
                      <NIcon icon="carbon:catalog opacity-50" />
                    </h2>
                  </div>
                  <template #popper>
                    Registry
                  </template>
                </VTooltip>
              </div>
              <div v-else-if="value === 'docs'" :class="[value === tab ? '' : 'op35']">
                <VTooltip>
                  <div class="px-5 py-2">
                    <h2 text-lg flex items-center>
                      <NIcon icon="carbon:book opacity-50" />
                    </h2>
                  </div>
                  <template #popper>
                    Documentation
                  </template>
                </VTooltip>
              </div>
              <input
                v-model="tab"
                type="radio"
                :value="value"
                :title="value"
                class="absolute cursor-pointer inset-0 op-0.1"
              >
            </label>
          </fieldset>
        </div>
        <div class="items-center space-x-3 hidden lg:flex">
          <div class="opacity-80 text-sm">
            <NLink href="https://github.com/nuxt/scripts" target="_blank">
              <NIcon icon="logos:github-icon" class="mr-[2px]" />
              Submit an issue
            </NLink>
          </div>
        </div>
      </div>
    </header>
    <div class="flex-row flex h-full" style="min-height: calc(100vh - 64px);">
      <main class="mx-auto flex flex-col w-full bg-white dark:bg-black dark:bg-dark-700 bg-light-200 ">
        <div v-if="tab === 'scripts'" class="h-full relative max-h-full p-4">
          <div v-if="!Object.keys(scripts || {}).length">
            <div>No scripts loaded.</div>
          </div>
          <div class="space-y-3 divide-y-gray-700">
            <div v-for="(script, id) in scripts" :key="id" class="w-full">
              <div>
                <!-- Logo and Title Section -->
                <div class="flex items-center justify-between w-full gap-7">
                  <div class="flex items-center gap-1">
                    <img
                      v-if="script.registry?.logo && typeof script.registry.logo === 'string' && script.registry.logo.startsWith('http')"
                      class="flex items-center max-w-6 h-6"
                      :src="typeof script.registry.logo === 'object' ? script.registry.logo.dark || script.registry.logo.light : script.registry.logo"
                      alt="Script logo"
                    >
                    <div
                      v-else-if="script.registry && script.registry.logo"
                      class="flex items-center max-w-6 h-6"
                      v-html="typeof script.registry.logo === 'object' ? (script.registry.logo.dark || script.registry.logo.light) : script.registry.logo"
                    />
                    <img
                      v-else-if="script.src && !script.src.startsWith('/')"
                      :src="`https://www.google.com/s2/favicons?domain=${urlToOrigin(script.src)}`"
                      class="w-4 h-4 rounded-lg"
                      alt="Script favicon"
                    >
                    <div v-else>
                      <NIcon icon="carbon:script" class="text-blue-300" />
                    </div>
                    <a
                      title="View script source"
                      class="text-base hover:bg-gray-800/50 px-2 transition py-1 rounded-xl font-semibold flex gap-2 items-center"
                      target="_blank" :href="script.src"
                    >
                      {{ script.registry?.label || script.key || script.src }}
                    </a>
                    <button
                      v-if="script.docs"
                      type="button" class="ml-2 opacity-50 hover:opacity-70 transition text-xs underline"
                      @click="viewDocs(script.docs)"
                    >
                      View docs
                    </button>
                  </div>
                  <div>
                    <NButton v-if="script.$script.status === 'awaitingLoad'" @click="script.$script.load()">
                      Load
                    </NButton>
                    <NButton v-else-if="script.$script.status === 'loaded'" @click="script.$script.remove()">
                      Remove
                    </NButton>
                  </div>
                </div>

                <!-- Chips and Stats Section -->
                <div class="flex items-center gap-3">
                  <ScriptStatus
                    :status="script.$script.status"
                    :error="scriptErrors[script.src]"
                  />
                  <ScriptSize :size="scriptSizes[script.src]" />
                  <ScriptLoadTime :load-time="script.loadTime" />
                  <div v-if="script.loadedFrom" class="flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" height="12" viewBox="0 0 256 221">
                      <!-- Icon from SVG Logos by Gil Barbara - https://raw.githubusercontent.com/gilbarbara/logos/master/LICENSE.txt -->
                      <path fill="#41B883" d="M204.8 0H256L128 220.8L0 0h97.92L128 51.2L157.44 0z" />
                      <path fill="#41B883" d="m0 0l128 220.8L256 0h-51.2L128 132.48L50.56 0z" />
                      <path fill="#35495E" d="M50.56 0L128 133.12L204.8 0h-47.36L128 51.2L97.92 0z" />
                    </svg>
                    <span class="text-xs opacity-50">{{ script.loadedFrom }}</span>
                  </div>
                  <div v-for="k in Object.keys(script.registryMeta || {})" :key="k" class="text-xs text-gray-500">
                    <span class="capitalize">{{ k }}</span>: {{ script.registryMeta[k] }}
                  </div>
                </div>
              </div>

              <!-- Tabs Section -->
              <div class="mt-4">
                <fieldset class="n-select-tabs flex flex-inline flex-wrap items-center border n-border-base rounded-lg n-bg-base">
                  <label
                    v-for="(tabOption, idx) in [{ label: 'Events', value: 'events' }, { label: 'API', value: 'api' }]"
                    :key="tabOption.value"
                    class="cursor-pointer flex items-center gap-2 px-4 py-2 transition-all"
                    :class="[
                      idx ? 'border-l n-border-base ml--1px' : '',
                      getActiveTab(script.src) === tabOption.value ? 'n-bg-active' : '',
                    ]"
                    @click="setActiveTab(script.src, tabOption.value)"
                  >
                    {{ tabOption.label }}
                    <input
                      :value="tabOption.value"
                      type="radio"
                      :name="`script-tab-${script.src}`"
                      :checked="getActiveTab(script.src) === tabOption.value"
                      class="sr-only"
                    >
                  </label>
                </fieldset>

                <!-- Tab Content -->
                <div class="mt-2">
                  <!-- Events Tab Content -->
                  <div v-if="getActiveTab(script.src) === 'events'" class="space-y-2 p-3">
                    <div
                      v-for="(event, key) in script.events" :key="key"
                      class="flex gap-3 text-xs justify-start items-center"
                    >
                      <div class="opacity-40">
                        {{ humanFriendlyTimestamp(event.at) }}
                      </div>
                      <template v-if="event.type === 'status'">
                        <div
                          v-if="event.status === 'loaded'"
                          class="font-bold px-2 py-[2px] bg-green-50 text-green-700 rounded-lg"
                        >
                          {{ event.status }}
                        </div>
                        <div
                          v-else-if="event.status === 'awaitingLoad'"
                          class="font-bold px-2 py-[2px] bg-gray-100 text-gray-700 rounded-lg"
                        >
                          {{ event.status }}
                        </div>
                        <div
                          v-else-if="event.status === 'removed' || event.status === 'error'"
                          class="font-bold px-2 py-[2px] bg-red-100 text-red-700 rounded-lg"
                        >
                          {{ event.status }}
                        </div>
                        <div
                          v-else-if="event.status === 'loading'"
                          class="font-bold px-2 py-[2px] bg-yellow-100 text-yellow-700 rounded-lg"
                        >
                          {{ event.status }}
                        </div>
                        <div v-else-if="event.status === 'validation-failed'" class="flex items-center gap-2">
                          <div class="font-bold px-2 py-[2px] bg-purple-100 text-purple-700 rounded-lg">
                            {{ event.status }}
                          </div>
                          {{
                            event.args.issues.map((i: any) => `${key}.${i.path?.map((i: any) => i.key).join(',')}: ${i.message}`).join(',')
                          }}
                        </div>
                      </template>
                      <div
                        v-else-if="event.type === 'fn-call' && event.args"
                        class="px-2 py-[2px] bg-gray-100 text-gray-700 rounded-lg font-mono"
                      >
                        {{ `${event.fn}(${event.args?.map((a: any) => JSON.stringify(a, null, 2)).join(', ') || ''})` }}
                      </div>
                      <div
                        v-else-if="event.type === 'fn-call' && !event.args"
                        class="px-2 py-[2px] bg-gray-100 text-gray-700 rounded-lg font-mono"
                      >
                        QUEUED {{ event.fn }}
                      </div>
                    </div>
                  </div>

                  <!-- API Tab Content -->
                  <div v-else-if="getActiveTab(script.src) === 'api'" class="space-y-3 p-3">
                    <OCodeBlock
                      :code="formatScriptInterface(script.$script?.instance)"
                      lang="typescript"
                      class="text-sm p-3 rounded"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-else-if="tab === 'registry'" class="h-full relative max-h-full p-4">
          <div v-if="!scriptRegistry || !scriptRegistry.length">
            <div>No registry scripts available.</div>
          </div>
          <div class="space-y-4">
            <div v-for="(script, index) in scriptRegistry" :key="index" class="rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <div class="flex items-start justify-between">
                <div class="flex items-center gap-3">
                  <img
                    v-if="script.logo && typeof script.logo === 'string' && script.logo.startsWith('http')"
                    class="flex items-center max-w-8 h-8"
                    :src="typeof script.logo === 'object' ? script.logo.dark || script.logo.light : script.logo"
                    alt="Script logo"
                  >
                  <div
                    v-else-if="script.logo"
                    class="flex items-center max-w-8 h-8"
                    v-html="typeof script.logo === 'object' ? (script.logo.dark || script.logo.light) : script.logo"
                  />
                  <div v-else class="flex items-center max-w-8 h-8">
                    <NIcon icon="carbon:script" class="text-blue-300 text-2xl" />
                  </div>
                  <div>
                    <h3 class="font-semibold text-lg">
                      {{ script.label }}
                    </h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400">
                      {{ script.description }}
                    </p>
                    <div class="flex items-center gap-2 mt-2">
                      <span class="text-xs px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded">
                        {{ script.category }}
                      </span>
                      <span v-if="script.src" class="text-xs text-gray-500">
                        {{ script.src }}
                      </span>
                    </div>
                  </div>
                </div>
                <div class="flex flex-col items-end gap-2">
                  <a
                    :href="`https://scripts.nuxt.com/scripts/${script.category}/${script.label.toLowerCase().replace(/ /g, '-')}`"
                    target="_blank"
                    class="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                  >
                    View docs
                  </a>
                </div>
              </div>

              <!-- Composable Usage Example -->
              <div class="mt-4">
                <OCodeBlock
                  :code="`const script = use${script.label.replace(/\s+/g, '')}()`"
                  lang="typescript"
                  class="text-sm rounded"
                />
              </div>
            </div>
          </div>
        </div>
        <div v-else-if="tab === 'docs'" class="h-full max-h-full overflow-hidden">
          <iframe
            src="https://scripts.nuxt.com/docs/getting-started" class="w-full h-full border-none"
            style="min-height: calc(100vh - 100px);"
          />
        </div>
      </main>
    </div>
  </div>
</template>
