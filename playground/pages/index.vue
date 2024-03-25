<script lang="ts" setup>
import type { VueScriptInstance } from '@unhead/vue'
import { ref, useHead, useScript } from '#imports'

const state = ref<{ trigger: 'default' | 'manual' | 'idle', src: string }>({
  trigger: 'default',
  src: 'https://cdn.jsdelivr.net/npm/js-confetti@latest/dist/js-confetti.browser.js',
})

useHead({
  title: 'Home',
})

const script = ref<VueScriptInstance<any> | null>(null)
const scriptFns = ref<Function[]>([])

async function submit() {
  const instance = useScript(state.value.src, {
    trigger: state.value.trigger === 'default' ? undefined : state.value.trigger,
    use() {
      return new window.JSConfetti()
    },
  })
  script.value = instance.$script
  instance.$script.then((script) => {
    console.log('got script', script)
    scriptFns.value = Object.keys(script)
  })
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
          Custom Script
        </h2>
        <UForm
          v-if="!script"
          class="mt-5"
          :state="state"
          @submit="submit"
        >
          <UFormGroup
            label="Script Source"
            name="src"
            class="mb-5"
          >
            <UInput
              v-model="state.src"
            />
          </UFormGroup>
          <UFormGroup
            label="Trigger"
            name="trigger"
            class="mb-5"
          >
            <USelectMenu
              v-model="state.trigger"
              :options="['default', 'idle', 'manual']"
            />
          </UFormGroup>

          <UButton type="submit">
            Create
          </UButton>
        </UForm>
        <div v-else>
          <div>
            Status: {{ script.status }}
          </div>
          <UButton
            v-if="script.status === 'awaitingLoad'"
            class="block my-5"
            @click="load"
          >
            Load {{ script.id }}
          </UButton>
          <div v-if="script.status === 'loaded'">
            {{ scriptFns }}
            <UButton
              class="block my-5"
              @click="() => doConfetti({ emojis: ['🌈', '⚡️', '💥', '✨', '💫', '🌸'] })"
            >
              addConfetti
            </UButton>
            <UButton
              class="block my-5"
              @click="reset"
            >
              Reset
            </UButton>
          </div>
        </div>
      </div>
      <div class="mb-10">
        <h2 class="font-bold mb-5 text-xl flex items-center">
          <Icon
            name="carbon:analytics"
            class="opacity-70 mr-2"
          />Analytics
        </h2>
        <ul class="space-y-5">
          <li>
            <ULink
              to="/analytics/fathom"
              class="underline"
            >
              Fathom Analytics
            </ULink>
          </li>
          <li>
            <ULink
              to="/analytics/cloudflare"
              class="underline"
            >
              Cloudflare Analytics
            </ULink>
          </li>
        </ul>
      </div>
      <div>
        <h2 class="font-bold mb-5 text-xl flex items-center">
          <Icon
            name="carbon:security"
            class="opacity-70 mr-2"
          />Captcha
        </h2>
        <ul class="space-y-5">
          <li>
            <ULink
              to="/captcha/cloudflare-turnstile"
              class="underline"
            >
              Cloudflare Turnstile
            </ULink>
          </li>
          <li>
            <ULink
              to="/captcha/google-recaptcha"
              class="underline"
            >
              Google Recaptcha
            </ULink>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
