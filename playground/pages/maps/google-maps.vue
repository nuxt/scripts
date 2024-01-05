<script setup>
import { ref } from 'vue';

const query = ref("Space+Needle,Seattle+WA");

function changeQuery() {
  query.value = "Brooklyn+Bride,New+York+NY";
}

</script>

<template>
  <div>
    <div>
      <GoogleMapsJavaScriptApi
        api-key="API_KEY"
        width="600"
        height="400"
        :q="query"
      />
    </div>
    <div class="button-container">
      <button
        class="button"
        @click="changeQuery"
      >
        change query
      </button>
    </div>
  </div>
</template>

<style>
.button-container {
  margin: 20px 0;
}

.button {
  background-color: orange;
  border-radius: 8px;
  padding: 4px 8px;
  cursor: pointer;
}

.button:not(:last-child) {
  margin-right: 8px;
}
</style>