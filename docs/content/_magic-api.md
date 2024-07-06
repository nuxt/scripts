```vue
<script lang="ts" setup>
const { $script, gtag } = useScriptGoogleAnalytics(
  { id: 'G-1234567' },
  { trigger: 'manual' }
)
// send events
gtag('config', 'UA-123456789-1')
// ..
$script.load() // load the script
</script>
```
