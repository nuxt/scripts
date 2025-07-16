<script lang="ts" setup>
import type { NavItem } from '@nuxt/content'
import type { Ref } from 'vue'

const topGuides = inject<Ref<NavItem[]>>('topGuides')
</script>

<template>
  <div>
    <footer class="text-sm text-gray-700 dark:text-gray-200 mt-20">
      <div class="border-t border-gray-200 dark:border-gray-800">
        <UContainer>
          <div class="py-10 grid xl:grid-cols-3 lg:gap-20 gap-10">
            <div>
              <div class="mb-5">
                <NuxtLink to="/" title="Home" class="flex items-end gap-1.5 font-bold text-xl text-gray-900 dark:text-white font-title">
                  <Logo />
                </NuxtLink>
              </div>
              <nav>
                <ul class="space-y-6">
                  <li>
                    <NuxtLink to="/docs/getting-started">
                      What is Nuxt Scripts?
                    </NuxtLink>
                  </li>
                  <li>
                    <NuxtLink to="/docs/getting-started/installation">
                      Install Nuxt Scripts
                    </NuxtLink>
                  </li>
                </ul>
              </nav>
            </div>
            <div>
              <h3 class="font-bold mb-5">
                Top Guides
              </h3>
              <nav>
                <ul class="grid grid-cols-2 gap-6">
                  <li v-for="(module, key) in topGuides" :key="key">
                    <NuxtLink :to="module.path">
                      {{ module.title }}
                    </NuxtLink>
                  </li>
                </ul>
              </nav>
            </div>
            <div>
              <div class="bg-gray-50 dark:bg-gray-900 flex rounded-xl shadow p-5">
                <div>
                  <div class="mb-2">
                    Hey <Icon name="noto:waving-hand" /> My name is <a href="https://harlanzw.com" target="_blank" class="underline">Harlan</a> and I'm the lead developer and maintainer of Nuxt Scripts.
                  </div>
                  <div>
                    Like the module? Let me know!
                  </div>
                </div>
                <div class="gap-3">
                  <img alt="Harlan Wilton" loading="lazy" src="https://avatars.githubusercontent.com/u/5326365?v=4" class="mx-auto rounded-full w-10 h-10 mb-3">
                  <div class="flex justify-center items-center">
                    <UButton color="white" title="Twitter" variant="link" to="https://twitter.com/harlan_zw" target="_blank">
                      <Icon name="i-ph-twitter-logo-duotone" class="text-xl" />
                    </UButton>
                    <UButton color="white" title="GitHub" aria-label="GitHub" variant="link" to="https://github.com/harlan-zw" target="_blank">
                      <Icon name="i-ph-github-logo-duotone" class="text-xl" />
                    </UButton>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </UContainer>
      </div>
      <div class="border-t border-gray-200 dark:border-gray-800">
        <UContainer>
          <div class="py-10">
            Copyright © {{ new Date().getFullYear() }} Nuxt Team - <a href="https://github.com/nuxt/scripts/blob/main/LICENSE">MIT License</a>
          </div>
        </UContainer>
      </div>
    </footer>
  </div>
</template>
