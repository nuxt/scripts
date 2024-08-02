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
  tpcTypeAugmentation?: string
  tpcTypesImport?: string[]
  key: string
  registry?: any
  scriptInput?: UseScriptInput
  performanceMarkFeature?: string
  useBody?: string
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
    tpcTypeAugmentation: 'GoogleTagManagerApi',
    tpcTypesImport: ['DataLayer'],
    key: 'googleTagManager',
    performanceMarkFeature: 'nuxt-third-parties-gtm',
    useBody: 'return { dataLayer: (window as any)[options.l ?? "dataLayer"] as DataLayer, google_tag_manager: window.google_tag_manager }',
    returnStub: 'fn === \'dataLayer\' ? [] : void 0',
  },
  // GA
  {
    fileName: 'google-analytics',
    label: 'Google Analytics',
    tpcKey: 'gtag',
    tpcData: GooglaAnalyticsData as Output,
    key: 'googleAnalytics',
    tpcTypesImport: ['DataLayer', 'GTag'],
    performanceMarkFeature: 'nuxt-third-parties-ga',
    useBody: 'const gtag: GTag = function (...args:Parameters<GTag>) { \n((window as any)["gtag-"+(options.l ?? "dataLayer")] as GTag)(...args);} as GTag\nreturn { dataLayer: (window as any)[options.l ?? "dataLayer"] as DataLayer,\n gtag }',
    // allow dataLayer to be accessed on the server
    returnStub: 'fn === \'dataLayer\' ? [] : void 0',
  }]

export async function generate() {
  for (const script of scripts) {
    script.registry = registry().find(r => r.label === script.label)
    const content = await generateTpcContent(script)
    await writeFile(resolve(`./src/runtime/registry/${script.fileName}.ts`), content)
  }
}

generate()
