```vue
<script lang="ts" setup>
const cookieConsent = useScriptTriggerConsent()
const myScript = useScript('/my-script.js', {
  trigger: cookieConsent 
})
</script>
<template>
  <CookieConsent @accept="cookieConsent.accept()" />
</template>
```
