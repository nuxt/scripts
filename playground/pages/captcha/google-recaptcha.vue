<script lang="ts" setup>
import { useGoogleRecaptcha } from '#imports'

const { $script, execute } = useGoogleRecaptcha()

execute('6Lc6LcUaAAAAAExy', { action: 'submit' })
</script>

<template>
  <div>
    Google Recaptcha
    <form>
      <input
        type="text"
        placeholder="Input"
      >
      <button type="submit">
        Submit
      </button>
    </form>
    <div>
      {{ $script }}
    </div>
  </div>
</template>
