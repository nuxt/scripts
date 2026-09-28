<template>
  <div>
    <ScriptGoogleMaps api-key="placeholder-not-a-key" :trigger="false" :width="400" :height="300">
      <ScriptGoogleMapsPolygon :options="{ paths: [] }" />
      <ScriptGoogleMapsPolyline :options="{ path: [] }" />
      <ScriptGoogleMapsCircle :options="{ radius: 10 }" />
      <ScriptGoogleMapsRectangle />
      <ScriptGoogleMapsGeoJson :src="{ type: 'FeatureCollection', features: [] }" />
    </ScriptGoogleMaps>
  </div>
</template>
