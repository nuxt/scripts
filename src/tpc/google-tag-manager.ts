import { addTemplate } from '@nuxt/kit'
import { GoogleTagManager } from 'third-party-capital'
import { getTpcScriptContent } from './utils'

export default async function addGoogleTagManager() {
  const { dst, filename } = addTemplate({
    write: true,
    getContents() {
      return getTpcScriptContent({
        data: GoogleTagManager({}),
        scriptFunctionName: 'useScriptGoogleTagManager',
        use: () => {
          return { dataLayer: window.dataLayer, google_tag_manager: window.google_tag_manager }
        },
        stub: ({ fn }) => {
          return fn === 'dataLayer' ? [] : undefined
        },
        TpcKey: 'gtm',
        apiTypeImport: 'GoogleTagManagerApi',
        augmentWindowTypes: true,
      })
    },
    filename: 'tpc/google-tag-manager.ts',
  })

  return {
    dst,
    filename,
    registry: {
      label: 'Google Tag Manager',
      category: 'tracking',
      logo: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 256"><path fill="#8AB4F8" d="m150.262 245.516l-44.437-43.331l95.433-97.454l46.007 45.091z"/><path fill="#4285F4" d="M150.45 53.938L106.176 8.731L9.36 104.629c-12.48 12.48-12.48 32.713 0 45.207l95.36 95.986l45.09-42.182l-72.654-76.407z"/><path fill="#8AB4F8" d="m246.625 105.37l-96-96c-12.494-12.494-32.756-12.494-45.25 0c-12.495 12.495-12.495 32.757 0 45.252l96 96c12.494 12.494 32.756 12.494 45.25 0c12.495-12.495 12.495-32.757 0-45.251"/><circle cx="127.265" cy="224.731" r="31.273" fill="#246FDB"/></svg>`,
      import: {
        name: 'useScriptGoogleTagManager',
        from: dst,
      },
    },
  }
}
