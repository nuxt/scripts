<script lang="ts" setup>
import { useHead, usePinterestTag } from "#imports";

useHead({
  title: "Pinterset tag",
});

const { trackPageview, trackEvent } = usePinterestTag({
  id: "YOUR_TAG_ID",
  email: "test@mail.com",
});

trackPageview();
</script>

<template>
  <div>
    <button @click="trackEvent('addtocart', { id: 1 })">Add to cart</button>
  </div>
</template>
