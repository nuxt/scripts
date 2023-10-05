<script lang="ts" setup>
import type { NuxtUseScriptOptions } from '../../modules/nuxt-scripts/src/runtime/composables/useScript'
import { ref, useConfetti } from '#imports'

const state = ref<{ trigger: 'default' | 'manual' | 'idle'; assetStrategy: 'default' | 'inline' | 'proxy' }>({
  trigger: 'default',
  assetStrategy: 'default',
})

const script = ref<NuxtUseScriptOptions<JSConfetti> | null>(null)

let doConfetti: JSConfetti['addConfetti'] = () => {}

async function submit() {
  const { $script, addConfetti } = useConfetti({
    trigger: state.value.trigger === 'default' ? undefined : state.value.trigger,
    assetStrategy: state.value.assetStrategy === 'default' ? undefined : state.value.assetStrategy,
  })
  doConfetti = addConfetti
  addConfetti()
  script.value = $script
}
function load() {
  script.value?.load()
}
function reset() {
  script.value?.remove()
  script.value = null
}
</script>

<template>
  <div>
    <div class="grid grid-cols-3 gap-10">
      <div>
        <h2 class="font-bold mb-5 text-xl flex items-center">
          Confetti
        </h2>
        <UForm
          v-if="!script"
          class="mt-5"
          :state="state"
          @submit="submit"
        >
          <UFormGroup label="Trigger" name="trigger" class="mb-5">
            <USelectMenu v-model="state.trigger" :options="['default', 'idle', 'manual']" />
          </UFormGroup>
          <UFormGroup label="Asset Strategy" name="assetStrategy" class="mb-5">
            <USelectMenu v-model="state.assetStrategy" :options="['default', 'proxy', 'inline']" />
          </UFormGroup>

          <UButton type="submit">
            Create
          </UButton>
        </UForm>
        <div v-else>
          <div>
            Status: {{ script.status }}
          </div>
          <UButton v-if="script.status === 'awaitingLoad'" class="block my-5" @click="load">
            Load {{ script.key }}
          </UButton>
          <UButton v-if="script.status === 'loaded'" class="block my-5" @click="() => doConfetti({ emojis: ['🌈', '⚡️', '💥', '✨', '💫', '🌸'] })">
            addConfetti
          </UButton>
          <UButton v-if="script.status === 'loaded'" class="block my-5" @click="reset">
            Reset
          </UButton>
        </div>
      </div>
      <div class="mb-10">
        <h2 class="font-bold mb-5 text-xl flex items-center">
          <Icon name="carbon:analytics" class="opacity-70 mr-2" />Analytics
        </h2>
        <ul class="space-y-5">
          <li>
            <ULink to="/analytics/fathom" class="underline">
              Fathom Analytics
            </ULink>
          </li>
          <li>
            <ULink to="/analytics/google" class="underline">
              Google Analytics
            </ULink>
          </li>
          <li>
            <ULink to="/analytics/cloudflare" class="underline">
              Cloudflare Analytics
            </ULink>
          </li>
        </ul>
      </div>
      <div>
        <h2 class="font-bold mb-5 text-xl flex items-center">
          <Icon name="carbon:security" class="opacity-70 mr-2" />Captcha
        </h2>
        <ul class="space-y-5">
          <li>
            <ULink to="/captcha/cloudflare-turnstile" class="underline">
              Cloudflare Turnstile
            </ULink>
          </li>
          <li>
            <ULink to="/captcha/google-analytics" class="underline">
              Google Recaptcha
            </ULink>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
