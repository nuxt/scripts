```vue
<script lang="ts" setup>
const { onLoaded, proxy } = useScriptGoogleAnalytics(
  { id: 'G-1234567' },
  { trigger: 'manual' }
)
// send events
proxy.gtag('config', 'UA-123456789-1')
// ..
onLoaded(() => {
  // script loaded
})
</script>
```
