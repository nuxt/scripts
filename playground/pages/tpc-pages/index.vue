<template>
  <div>
    <div class="grid grid-cols-3 gap-10">
      <div class="mb-10">
        <h2 class="font-bold mb-5 text-xl flex items-center">
          <Icon
            name="carbon:analytics"
            class="opacity-70 mr-2"
          />Analytics
        </h2>
        <ul class="space-y-5">
          <li>
            <ULink
              to="/analytics/google-analytics"
              class="underline"
            >
              Google Analytics
            </ULink>
          </li>
          <li>
            <ULink
              to="/analytics/google-tag-manager"
              class="underline"
            >
              Google Tag Manager
            </ULink>
          </li>
        </ul>
      </div>
      <div>
        <h2 class="font-bold mb-5 text-xl flex items-center">
          <Icon
            name="carbon:video-player"
            class="opacity-70 mr-2"
          />Video
        </h2>
        <ul class="space-y-5">
          <li>
            <ULink
              to="/video/youtube"
              class="underline"
            >
              Youtube
            </ULink>
          </li>
        </ul>
      </div>
      <div>
        <h2 class="font-bold mb-5 text-xl flex items-center">
          <Icon
            name="carbon:map"
            class="opacity-70 mr-2"
          />Map
        </h2>
        <ul class="space-y-5">
          <li>
            <ULink
              to="/maps/google-maps"
              class="underline"
            >
              Google Maps
            </ULink>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
