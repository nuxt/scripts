<script lang="ts" setup>
import { onDevtoolsClientConnected } from '@nuxt/devtools-kit/iframe-client'
import { devtools, getScriptSize, humanFriendlyTimestamp, reactive, ref, urlToOrigin } from '#imports'
import { loadShiki } from '~/composables/shiki'

await loadShiki()

const scripts = ref({})
const scriptSizes = reactive({})

function syncScripts(_scripts: any[]) {
  scripts.value = { ..._scripts }
  // check if the script size has been set, if not set it
  for (const key in _scripts) {
    if (!scriptSizes[key]) {
      getScriptSize(_scripts[key].src).then((size) => {
        scriptSizes[key] = size
      }).catch(() => {
        scriptSizes[key] = 0
      })
    }
  }
}

onDevtoolsClientConnected(async (client) => {
  devtools.value = client.devtools
  client.host.nuxt.hooks.hook('scripts:updated', (ctx) => {
    syncScripts(ctx.scripts)
  })
  syncScripts(client.host.nuxt._scripts)
})
</script>

<template>
  <div class="relative n-bg-base flex flex-col">
    <div class="flex-row flex p4 h-full" style="min-height: calc(100vh - 64px);">
      <main class="mx-auto flex flex-col w-full">
        <div v-if="!Object.keys(scripts).length">
          <div>No scripts loaded.</div>
        </div>
        <div class="space-y-3">
          <div v-for="(script, id) in scripts" :key="id" class="w-full">
            <div class="flex items-center justify-between w-full mb-3">
              <div class="flex items-center gap-4">
                <a class="text-xl font-bold flex gap-2  items-center font-mono" :title="script.src" target="_blank" :href="script.src">
                  <img :src="`https://www.google.com/s2/favicons?domain=${urlToOrigin(script.src)}`" class="w-4 h-4 rounded-lg">
                  <div>{{ script.key }}</div>
                </a>
                <div class="opacity-70">
                  {{ script.$script.status }}
                </div>
                <div v-if="scriptSizes[script.key]">
                  {{ scriptSizes[script.key] }}
                </div>
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
            <div class="space-y-2">
              <div v-for="(event, key) in script.events" :key="key" class="flex gap-3 text-xs justify-start items-center">
                <div class="opacity-40">
                  {{ humanFriendlyTimestamp(event.at) }}
                </div>
                <template v-if="event.type === 'status'">
                  <div v-if="event.status === 'loaded'" class="font-bold px-2 py-[2px] bg-green-50 text-green-700 rounded-lg">
                    {{ event.status }}
                  </div>
                  <div v-else-if="event.status === 'awaitingLoad'" class="font-bold px-2 py-[2px] bg-gray-100 text-gray-700 rounded-lg">
                    {{ event.status }}
                  </div>
                  <div v-else-if="event.status === 'removed' || event.status === 'error'" class="font-bold px-2 py-[2px] bg-red-100 text-red-700 rounded-lg">
                    {{ event.status }}
                  </div>
                  <div v-else-if="event.status === 'loading'" class="font-bold px-2 py-[2px] bg-yellow-100 text-yellow-700 rounded-lg">
                    {{ event.status }}
                  </div>
                </template>
                <template v-else-if="event.type === 'fn-call'">
                  <OCodeBlock :code="`${event.fn}(${event.args.map(a => JSON.stringify(a, null, 2)).join(', ')})`" lang="javascript" />
                </template>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>
