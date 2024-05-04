<script lang="ts" setup>
import { useScriptMyCustomScript } from '#imports'

const { myScript } = useScriptMyCustomScript()

myScript('test')
</script>

<template>
  <div>hello world</div>
</template>
