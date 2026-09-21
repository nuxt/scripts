<script setup lang="ts">
const data = { type: 'FeatureCollection', features: [] } as const
</script>

<template>
  <div>
    <ScriptLeafletMap
      :trigger="false"
      :center="[0, 0]"
      :width="400"
      :height="300"
      aria-label="Leaflet hydration map"
    >
      <!-- The map never loads, so no tile is requested. -->
      <ScriptLeafletTileLayer url="/tiles/{z}/{x}/{y}.png" />
      <ScriptLeafletGeoJson :data="data" />
    </ScriptLeafletMap>
  </div>
</template>
