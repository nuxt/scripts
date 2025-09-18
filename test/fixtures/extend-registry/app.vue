<script lang="ts" setup>
import { useScriptMyCustomScript } from '#imports'

const { proxy } = useScriptMyCustomScript()

proxy.myScript('test')
</script>

<template>
  <div>hello world</div>
</template>
