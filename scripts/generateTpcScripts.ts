import { writeFile } from 'node:fs/promises'
import { GooglaAnalyticsData, GoogleTagManagerData, type Output } from 'third-party-capital'
import type { UseScriptInput } from '@unhead/vue'
import { resolve } from 'pathe'
import type { NuxtUseScriptOptions } from '../src/runtime/types'
import { registry } from '../src/registry'
import { generateTpcContent } from './utils'

export interface TpcDescriptor {
  label: string
  tpcKey: string
  tpcData: Output
  tpcTypeImport: string
  key: string
  registry?: any
  options: ({
    scriptInput?: UseScriptInput
    scriptOptions?: NuxtUseScriptOptions
    schema?: any
    clientInit?: () => void
  })
}

const scripts: TpcDescriptor[] = [
  // GTM
  {
    label: 'Google Tag Manager',
    tpcKey: 'gtm',
    tpcData: GoogleTagManagerData as Output,
    tpcTypeImport: 'GoogleTagManagerApi',
    key: 'google-tag-manager',
    options: {
      scriptOptions: {
        performanceMarkFeature: 'nuxt-third-parties-gtm',
        use: () => {
          // @ts-expect-error untyped
          return { dataLayer: window.dataLayer, google_tag_manager: window.google_tag_manager }
        },
        stub: ({ fn }) => {
          return fn === 'dataLayer' ? [] : undefined
        },
      },
    },
  },
  // GA
  {
    label: 'Google Analytics',
    tpcKey: 'gtag',
    tpcData: GooglaAnalyticsData as Output,
    key: 'google-analytics',
    tpcTypeImport: 'GoogleAnalyticsApi',
    options: {
      scriptOptions: {
        performanceMarkFeature: 'nuxt-third-parties-ga',
        use: () => {
          // @ts-expect-error untyped
          return { dataLayer: window.dataLayer, gtag: window.gtag }
        },
        // allow dataLayer to be accessed on the server
        stub: ({ fn }) => {
          return fn === 'dataLayer' ? [] : undefined
        },
      },
    },
  }]

export async function generate() {
  for (const script of scripts) {
    script.registry = registry().find(r => r.label === script.label)
    const content = await generateTpcContent(script)
    await writeFile(resolve(`./src/runtime/registry/${script.key}.ts`), content)
  }
}

generate()
