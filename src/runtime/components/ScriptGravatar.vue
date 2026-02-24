<script setup lang="ts">
import { computed, ref, onMounted, useAttrs } from 'vue'
import { useScriptGravatar } from '../registry/gravatar'

const props = withDefaults(defineProps<{
  /** Email address — hashed server-side, never exposed in client HTML */
  email?: string
  /** Pre-computed SHA256 hash of the email */
  hash?: string
  /** Avatar size in pixels */
  size?: number
  /** Default avatar style when no Gravatar exists */
  default?: string
  /** Content rating filter */
  rating?: string
  /** Enable hovercards on hover */
  hovercards?: boolean
}>(), {
  size: 80,
  default: 'mp',
  rating: 'g',
  hovercards: false,
})

const attrs = useAttrs()
const imgSrc = ref('')

const { $script } = useScriptGravatar()

const queryOverrides = computed(() => ({
  size: props.size,
  default: props.default,
  rating: props.rating,
}))

onMounted(() => {
  $script.then((api) => {
    if (props.email) {
      imgSrc.value = api.getAvatarUrlFromEmail(props.email, queryOverrides.value)
    }
    else if (props.hash) {
      imgSrc.value = api.getAvatarUrl(props.hash, queryOverrides.value)
    }
  })
})
</script>

<template>
  <img
    v-if="imgSrc"
    :src="imgSrc"
    :width="size"
    :height="size"
    :class="{ hovercard: hovercards }"
    v-bind="attrs"
    :alt="attrs.alt as string || 'Gravatar avatar'"
    loading="lazy"
  >
  <span
    v-else
    :style="{ display: 'inline-block', width: `${size}px`, height: `${size}px`, borderRadius: '50%', background: '#e0e0e0' }"
  />
</template>
