import { writeFile } from 'node:fs/promises'
import { GooglaAnalyticsData, GoogleTagManagerData, type Output } from 'third-party-capital'
import type { UseScriptInput } from '@unhead/vue'
import { resolve } from 'pathe'
import { registry } from '../src/registry'
import { generateTpcContent } from './utils'

export interface TpcDescriptor {
  fileName: string
  label: string
  tpcKey: string
  tpcData: Output
  tpcTypeImport: string
  key: string
  registry?: any
  scriptInput?: UseScriptInput
  performanceMarkFeature?: string
  returnUse?: string
  returnStub?: string
  clientInit?: string
  defaultOptions?: Record<string, unknown>
}

const scripts: Array<TpcDescriptor> = [
  // GTM
  {
    fileName: 'google-tag-manager',
    label: 'Google Tag Manager',
    tpcKey: 'gtm',
    tpcData: GoogleTagManagerData as Output,
    tpcTypeImport: 'GoogleTagManagerApi',
    key: 'googleTagManager',
    performanceMarkFeature: 'nuxt-third-parties-gtm',
    returnUse: '{ dataLayer: window.dataLayers[options.dataLayerName!], google_tag_manager: window.google_tag_manager }',
    returnStub: 'fn === \'dataLayer\' ? [] : void 0',
    defaultOptions: {
      dataLayerName: 'defaultGtm',
    },
  },
  // GA
  {
    fileName: 'google-analytics',
    label: 'Google Analytics',
    tpcKey: 'gtag',
    tpcData: GooglaAnalyticsData as Output,
    key: 'googleAnalytics',
    tpcTypeImport: 'GoogleAnalyticsApi',
    performanceMarkFeature: 'nuxt-third-parties-ga',
    returnUse: '{ dataLayer: window.dataLayers[options.dataLayerName!], gtag: window.gtag }',
    // allow dataLayer to be accessed on the server
    returnStub: 'fn === \'dataLayer\' ? [] : void 0',
    defaultOptions: {
      dataLayerName: 'defaultGa',
    },
  }]

export async function generate() {
  for (const script of scripts) {
    script.registry = registry().find(r => r.label === script.label)
    const content = await generateTpcContent(script)
    await writeFile(resolve(`./src/runtime/registry/${script.fileName}.ts`), content)
  }
}

generate()
