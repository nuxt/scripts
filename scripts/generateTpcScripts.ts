import { writeFile } from 'node:fs/promises'
import { GooglaAnalyticsData, GoogleTagManagerData, type Output } from 'third-party-capital'
import type { UseScriptInput } from '@unhead/vue'
import { resolve } from 'pathe'
import { registry } from '../src/registry'
import { generateTpcContent } from './utils'

export interface TpcDescriptor {
  label: string
  tpcKey: string
  tpcData: Output
  tpcTypeAugmentation?: string
  tpcTypesImport?: string[]
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
    label: 'Google Tag Manager',
    tpcKey: 'gtm',
    tpcData: GoogleTagManagerData as Output,
    tpcTypeAugmentation: 'GoogleTagManagerApi',
    tpcTypesImport: ['DataLayer'],
    key: 'google-tag-manager',
    performanceMarkFeature: 'nuxt-third-parties-gtm',
    returnUse: '{ dataLayer: window[options.l!] as DataLayer, google_tag_manager: window.google_tag_manager }',
    returnStub: 'fn === \'dataLayer\' ? [] : void 0',
    defaultOptions: {
      l: 'defaultGtm',
    },
  },
  // GA
  {
    label: 'Google Analytics',
    tpcKey: 'gtag',
    tpcData: GooglaAnalyticsData as Output,
    key: 'google-analytics',
    tpcTypesImport: ['DataLayer'],
    performanceMarkFeature: 'nuxt-third-parties-ga',
    returnUse: '{ dataLayer: window[options.l!] as DataLayer }',
    // allow dataLayer to be accessed on the server
    returnStub: 'fn === \'dataLayer\' ? [] : void 0',
    defaultOptions: {
      l: 'defaultGa',
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
