<template>
  <div>
    Nuxt module playground!
    <button
      @click="router.push('/' + (Math.random() * 100).toFixed(0))"
    >
      Go to random page
    </button>
  </div>
</template>

<script setup>
const router = useRouter()
</script>
