import { GooglaAnalyticsData, GoogleAnalytics, GoogleTagManager, GoogleTagManagerData, type Output } from 'third-party-capital'
import { addImports, addTemplate, useNuxt } from '@nuxt/kit'
import type { RegistryScript } from '../runtime/types'
import { extendTypes } from '../kit'
import { generateTpcContent, generateTpcTypes, type ScriptContentOpts } from './utils'

interface TpcDescriptor {
  input: ScriptContentOpts
  filename: string
  registry: RegistryScript
}

const scripts: TpcDescriptor[] = [{
  input: {
    data: GoogleTagManagerData as Output,
    scriptFunctionName: 'useScriptGoogleTagManager',
    use: () => {
      return { dataLayer: window.dataLayer, google_tag_manager: window.google_tag_manager }
    },
    stub: ({ fn }) => {
      return fn === 'dataLayer' ? [] : undefined
    },
    tpcKey: 'gtm',
    tpcTypeImport: 'GoogleTagManagerApi',
    featureDetectionName: 'nuxt-third-parties-gtm',
  },
  filename: 'nuxt-scripts-gtm',
  registry: {
    label: 'Google Tag Manager',
    category: 'tracking',
    logo: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 256"><path fill="#8AB4F8" d="m150.262 245.516l-44.437-43.331l95.433-97.454l46.007 45.091z"/><path fill="#4285F4" d="M150.45 53.938L106.176 8.731L9.36 104.629c-12.48 12.48-12.48 32.713 0 45.207l95.36 95.986l45.09-42.182l-72.654-76.407z"/><path fill="#8AB4F8" d="m246.625 105.37l-96-96c-12.494-12.494-32.756-12.494-45.25 0c-12.495 12.495-12.495 32.757 0 45.252l96 96c12.494 12.494 32.756 12.494 45.25 0c12.495-12.495 12.495-32.757 0-45.251"/><circle cx="127.265" cy="224.731" r="31.273" fill="#246FDB"/></svg>`,
    scriptBundling(options) {
      const data = GoogleTagManager(options)
      const mainScript = data.scripts?.find(({ key }) => key === 'gtag')

      if (mainScript && 'url' in mainScript && mainScript.url)
        return mainScript.url

      return false
    },
  },
}, {
  input: {
    data: GooglaAnalyticsData as Output,
    scriptFunctionName: 'useScriptGoogleAnalytics',
    use: () => {
      return { dataLayer: window.dataLayer, gtag: window.gtag }
    },
    // allow dataLayer to be accessed on the server
    stub: ({ fn }) => {
      return fn === 'dataLayer' ? [] : undefined
    },
    tpcKey: 'gtag',
    tpcTypeImport: 'GoogleAnalyticsApi',
    featureDetectionName: 'nuxt-third-parties-ga',
  },
  filename: 'nuxt-scripts-ga',
  registry: {
    label: 'Google Analytics',
    category: 'tracking',
    logo: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 256"><path fill="#8AB4F8" d="m150.262 245.516l-44.437-43.331l95.433-97.454l46.007 45.091z"/><path fill="#4285F4" d="M150.45 53.938L106.176 8.731L9.36 104.629c-12.48 12.48-12.48 32.713 0 45.207l95.36 95.986l45.09-42.182l-72.654-76.407z"/><path fill="#8AB4F8" d="m246.625 105.37l-96-96c-12.494-12.494-32.756-12.494-45.25 0c-12.495 12.495-12.495 32.757 0 45.252l96 96c12.494 12.494 32.756 12.494 45.25 0c12.495-12.495 12.495-32.757 0-45.251"/><circle cx="127.265" cy="224.731" r="31.273" fill="#246FDB"/></svg>`,
    scriptBundling(options) {
      const data = GoogleAnalytics(options)
      const mainScript = data.scripts?.find(({ key }) => key === 'gtag')

      if (mainScript && 'url' in mainScript && mainScript.url)
        return mainScript.url

      return false
    },
  },
}]

export function addTpc(registry: RegistryScript[]) {
  const nuxt = useNuxt()
  const fileImport = new Map<string, string>()

  for (const script of scripts) {
    extendTypes(script.filename, async () => await generateTpcTypes(script.input))

    const { dst } = addTemplate({
      getContents() {
        return generateTpcContent(script.input)
      },
      filename: `modules/${script.filename}.ts`,
    })

    addImports({
      from: dst,
      name: 'useScriptGoogleAnalytics',
    })

    script.registry.import = {
      from: dst,
      name: script.input.scriptFunctionName,
    }

    fileImport.set(script.filename, script.input.scriptFunctionName)

    registry.push(script.registry)
  }

  nuxt.hook('prepare:types', async ({ declarations }) => {
    declarations.push(`
${Array.from(fileImport).map(([filename, fn]) => `import { ${fn} } from '#build/modules/${filename}'`).join('\n')}
declare module '#imports' {
${Array.from(fileImport).map(([_, fn]) => `  export { ${fn} }`).join('\n')}
}    
    `)
  })
}
