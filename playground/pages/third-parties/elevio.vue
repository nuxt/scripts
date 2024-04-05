<script lang="ts" setup>
import type { WindowElev } from './ele'
import { ref, useHead, useScript } from '#imports'

useHead({
  title: 'elevio',
})

declare global {
  interface Window {
    _elev: WindowElev
  }
}

// composables return the underlying api as a proxy object and a $script with the script state
const { $script, setAccountId } = useScript<WindowElev>({
  src: 'https://cdn.elev.io/sdk/bootloader/v4/elevio-bootloader.js',
}, {
  use: () => window._elev,
})

setAccountId('611fa917ad150')
</script>

<template>
  <div>
    <ClientOnly>
      <div>
        status: {{ $script.status.value }}
      </div>
    </ClientOnly>
  </div>
</template>
