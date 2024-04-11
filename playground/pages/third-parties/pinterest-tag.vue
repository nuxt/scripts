<script lang="ts" setup>
import { useHead, usePinterestTag } from "#imports";

useHead({
  title: "Pinterset tag",
});

const { $script, pintrk } = usePinterestTag({
  id: "YOUR_TAG_ID",
  email: "test@mail.com",
});

pintrk("page");

function triggerEvent(){
  pintrk('track', 'addtocart', {
    product_id: '1'
  });
}
</script>

<template>
  <div>
    status: {{ $script.status }}
  </div>
  <button @click="triggerEvent">
    Trigger Event
  </button>
</template>
