<script lang="ts" setup>
import { onUnmounted, ref, useHead, useScriptTawkTo } from '#imports'

useHead({
  title: 'Tawk.to',
})

// composables return the underlying api as a proxy object, plus the derived
// reactive state, getters, and event listeners bridged from Tawk's window
// CustomEvents (`status` here is the script's own load state; `chatStatus`
// is Tawk's online/away/offline)
const {
  status,
  chatStatus,
  proxy,
  isHidden,
  isMinimized,
  isMaximized,
  unreadCount,
  onLoad,
  onChatStarted,
  onChatEnded,
  onChatMaximized,
  onChatMinimized,
  onChatHidden,
  onStatusChange,
  onUnreadCountChanged,
  getWindowType,
  getStatus,
  isChatMaximized,
  isChatMinimized,
  isChatHidden,
  isChatOngoing,
  isVisitorEngaged,
  widgetPosition,
  setVisitor,
} = useScriptTawkTo({
  propertyId: '68496650ddf9cd19094b4530',
  widgetId: '1itfbfagd',
  // The playground's nuxt.config.ts defaults every registry entry to
  // trigger: 'manual' (so nothing auto-loads on every page). Override it
  // here so this composable-only demo actually loads on navigation, same
  // as a real app relying on the module's own onNuxtReady default would.
  scriptOptions: {
    trigger: 'onNuxtReady',
  },
})

const eventLog = ref<Array<{ time: string, event: string }>>([])
function logEvent(event: string) {
  eventLog.value.unshift({ time: new Date().toLocaleTimeString(), event })
  if (eventLog.value.length > 20)
    eventLog.value.pop()
}

const cleanups = [
  onLoad(() => logEvent('onLoad')),
  onChatStarted(() => logEvent('onChatStarted')),
  onChatEnded(() => logEvent('onChatEnded')),
  onChatMaximized(() => logEvent('onChatMaximized')),
  onChatMinimized(() => logEvent('onChatMinimized')),
  onChatHidden(() => logEvent('onChatHidden')),
  onStatusChange(s => logEvent(`onStatusChange -> ${s}`)),
  onUnreadCountChanged(count => logEvent(`onUnreadCountChanged -> ${count}`)),
]
onUnmounted(() => cleanups.forEach(stop => stop()))

// Getters call straight through to window.Tawk_API (see the composable's
// TawkToProxyApi doc comment) rather than through `proxy`, which discards
// every return value even once the script has loaded.
const getters = { getWindowType, getStatus, isChatMaximized, isChatMinimized, isChatHidden, isChatOngoing, isVisitorEngaged, widgetPosition }
const getterResult = ref('')
function callGetter(name: keyof typeof getters) {
  getterResult.value = `${name}() => ${JSON.stringify(getters[name]())}`
}

// Visitor identification
const visitorName = ref('')
const visitorEmail = ref('')
function identifyVisitor() {
  setVisitor({ name: visitorName.value || undefined, email: visitorEmail.value || undefined })
  logEvent(`setVisitor({ name: '${visitorName.value}', email: '${visitorEmail.value}' })`)
}

// Tags
const tagInput = ref('')
function addTag() {
  if (!tagInput.value)
    return
  proxy.addTags([tagInput.value])
  logEvent(`proxy.addTags(['${tagInput.value}'])`)
  tagInput.value = ''
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold">
        Tawk.to
      </h1>
      <p class="text-gray-600 mt-2">
        Free live chat widget, loaded through a typed proxy, reactive state, and event listeners.
      </p>
      <UAlert
        icon="i-heroicons-information-circle"
        color="info"
        variant="soft"
        class="mt-4"
        title="Demo Configuration"
        description="This example uses a real demo propertyId/widgetId. Replace with your own Tawk.to property for production use."
      />
    </div>

    <ClientOnly>
      <UCard>
        <template #header>
          <h2 class="text-xl font-semibold">
            Script Status
          </h2>
        </template>

        <div class="space-y-3">
          <div>
            <span class="font-medium">status:</span>
            <UBadge :color="status === 'loaded' ? 'success' : status === 'error' ? 'error' : 'warning'" class="ml-2">
              {{ status }}
            </UBadge>
            <span class="font-medium ml-4">chatStatus:</span>
            <UBadge :color="chatStatus === 'online' ? 'success' : chatStatus === 'away' ? 'warning' : 'neutral'" class="ml-2">
              {{ chatStatus }}
            </UBadge>
          </div>
          <div>
            <span class="font-medium">reactive state:</span>
            <UBadge :color="isHidden ? 'error' : 'neutral'" variant="soft" class="ml-2">
              isHidden: {{ isHidden }}
            </UBadge>
            <UBadge :color="isMinimized ? 'warning' : 'neutral'" variant="soft" class="ml-2">
              isMinimized: {{ isMinimized }}
            </UBadge>
            <UBadge :color="isMaximized ? 'success' : 'neutral'" variant="soft" class="ml-2">
              isMaximized: {{ isMaximized }}
            </UBadge>
            <UBadge color="info" variant="soft" class="ml-2">
              unreadCount: {{ unreadCount }}
            </UBadge>
          </div>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="text-xl font-semibold">
            Widget Controls
          </h2>
        </template>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <UButton :disabled="status !== 'loaded'" @click="proxy.maximize()">
            Maximize
          </UButton>
          <UButton :disabled="status !== 'loaded'" @click="proxy.minimize()">
            Minimize
          </UButton>
          <UButton :disabled="status !== 'loaded'" @click="proxy.toggle()">
            Toggle
          </UButton>
          <UButton :disabled="status !== 'loaded'" @click="proxy.popup()">
            Popup
          </UButton>
          <UButton :disabled="status !== 'loaded'" color="warning" @click="proxy.hideWidget()">
            Hide
          </UButton>
          <UButton :disabled="status !== 'loaded'" color="success" @click="proxy.showWidget()">
            Show
          </UButton>
          <UButton :disabled="status !== 'loaded'" @click="proxy.toggleVisibility()">
            Toggle Visibility
          </UButton>
          <UButton :disabled="status !== 'loaded'" color="error" variant="outline" @click="proxy.endChat()">
            End Chat
          </UButton>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="text-xl font-semibold">
            Getters
          </h2>
        </template>

        <div class="space-y-3">
          <div class="flex flex-wrap gap-3">
            <UButton :disabled="status !== 'loaded'" size="sm" variant="outline" @click="callGetter('getWindowType')">
              getWindowType()
            </UButton>
            <UButton :disabled="status !== 'loaded'" size="sm" variant="outline" @click="callGetter('getStatus')">
              getStatus()
            </UButton>
            <UButton :disabled="status !== 'loaded'" size="sm" variant="outline" @click="callGetter('isChatMaximized')">
              isChatMaximized()
            </UButton>
            <UButton :disabled="status !== 'loaded'" size="sm" variant="outline" @click="callGetter('isChatMinimized')">
              isChatMinimized()
            </UButton>
            <UButton :disabled="status !== 'loaded'" size="sm" variant="outline" @click="callGetter('isChatHidden')">
              isChatHidden()
            </UButton>
            <UButton :disabled="status !== 'loaded'" size="sm" variant="outline" @click="callGetter('isChatOngoing')">
              isChatOngoing()
            </UButton>
            <UButton :disabled="status !== 'loaded'" size="sm" variant="outline" @click="callGetter('isVisitorEngaged')">
              isVisitorEngaged()
            </UButton>
            <UButton :disabled="status !== 'loaded'" size="sm" variant="outline" @click="callGetter('widgetPosition')">
              widgetPosition()
            </UButton>
          </div>
          <div v-if="getterResult" class="text-sm font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded">
            {{ getterResult }}
          </div>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="text-xl font-semibold">
            Visitor & Tags
          </h2>
        </template>

        <div class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <UInput v-model="visitorName" placeholder="Visitor name" />
            <UInput v-model="visitorEmail" placeholder="Visitor email" />
            <UButton :disabled="status !== 'loaded'" @click="identifyVisitor">
              Set Visitor
            </UButton>
          </div>
          <div class="flex items-center gap-3">
            <UInput v-model="tagInput" placeholder="Tag name" class="flex-1" />
            <UButton :disabled="status !== 'loaded' || !tagInput" @click="addTag">
              Add Tag
            </UButton>
          </div>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="text-xl font-semibold">
            Event Log
          </h2>
        </template>

        <div class="space-y-2 max-h-64 overflow-y-auto">
          <div
            v-for="(entry, i) in eventLog"
            :key="i"
            class="text-sm font-mono p-2 rounded bg-gray-50 dark:bg-gray-800"
          >
            <span class="text-gray-500">{{ entry.time }}</span>
            <span class="ml-2">{{ entry.event }}</span>
          </div>
          <div v-if="eventLog.length === 0" class="text-gray-400 text-sm">
            No events logged yet
          </div>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="text-xl font-semibold">
            Implementation
          </h2>
        </template>

        <div class="space-y-4 text-sm">
          <div>
            <h3 class="font-medium mb-2">
              Basic Setup
            </h3>
            <pre class="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-x-auto"><code>const { proxy, status, chatStatus, isHidden, unreadCount } = useScriptTawkTo({
  propertyId: 'your-property-id',
  widgetId: 'your-widget-id',
})

proxy.maximize()</code></pre>
          </div>

          <div>
            <h3 class="font-medium mb-2">
              Getters &amp; Visitor
            </h3>
            <pre class="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-x-auto"><code>const { getStatus, isChatHidden, setVisitor } = useScriptTawkTo({ ... })

// proxy.getStatus() always returns undefined (proxy is fire-and-forget);
// these call straight through to window.Tawk_API instead
getStatus() // => 'online' | 'away' | 'offline' | undefined
isChatHidden() // => boolean

setVisitor({ name: 'Jane Doe', email: 'jane@example.com' })</code></pre>
          </div>

          <div>
            <h3 class="font-medium mb-2">
              Event Listeners
            </h3>
            <pre class="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-x-auto"><code>const { onChatStarted, onChatEnded, onUnreadCountChanged } = useScriptTawkTo({ ... })

const stop = onChatStarted(() => console.log('chat started'))
onUnmounted(stop)</code></pre>
          </div>
        </div>
      </UCard>
    </ClientOnly>
  </div>
</template>
