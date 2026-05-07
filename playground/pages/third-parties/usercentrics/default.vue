<script lang="ts" setup>
// Manual / "default" integration: render the loader script tag yourself
// without going through useScriptUsercentrics. Kept for parity with other
// playground pages and as a sanity check that both paths produce the same
// CMP boot sequence.
import { useHead } from '#imports'

useHead({
  script: [
    {
      'id': 'usercentrics-cmp',
      'src': 'https://app.usercentrics.eu/browser-ui/latest/loader.js',
      'data-settings-id': 'PLACEHOLDER_SETTINGS_ID',
      'async': true,
    },
  ],
})
</script>

<template>
  <div>
    <h1>Usercentrics (default head injection)</h1>
    <p>The loader is added via <code>useHead</code>. Replace the settings ID to test against a real account.</p>
  </div>
</template>
