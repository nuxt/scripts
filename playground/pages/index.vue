<script lang="ts" setup>
import type { VueScriptInstance } from '@unhead/vue'
import { injectHead, ref, useScript } from '#imports'

const state = ref({
  key: 'confetti',
  src: 'https://cdn.jsdelivr.net/npm/js-confetti@latest/dist/js-confetti.browser.js',
  trigger: undefined,
  assetStrategy: undefined,
})

const script = ref<VueScriptInstance<any> | null>(null)

let doConfetti = () => {}

async function submit() {
  const { $script, addConfetti } = useScript<{ addConfetti: () => void }>({
    key: state.value.key,
    src: state.value.src,
    // onload() {
    //   console.log('onload test')
    // }
  }, {
    trigger: state.value.trigger === 'default' ? undefined : state.value.trigger,
    assetStrategy: state.value.assetStrategy === 'default' ? undefined : state.value.assetStrategy,
    use: () => {
      return new window.JSConfetti()
    },
  })
  doConfetti = addConfetti
  $script.waitForUse().then(() => {
    console.log('ready!')
  })
  addConfetti()
  script.value = $script
}
function load() {
  script.value.load()
}
function reset() {
  script.value = null
  const head = injectHead()
  delete head._scripts[script.value.key]
}
</script>

<template>
  <div>
    <div class="grid grid-cols-3 gap-10">
      <div>
        <h2>Load Confetti</h2>
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
