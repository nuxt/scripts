import { ref } from 'vue'
import type { $Fetch } from 'nitropack'
import type { NuxtDevtoolsClient } from '@nuxt/devtools-kit/types'

export const devtools = ref<NuxtDevtoolsClient>()

export const appFetch = ref<$Fetch>()
