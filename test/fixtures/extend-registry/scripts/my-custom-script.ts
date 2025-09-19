import { useRegistryScript } from '#nuxt-scripts/utils'

export interface CustomApi {
  myScript: () => void
}

export function useScriptMyCustomScript<T extends CustomApi>() {
  return useRegistryScript<T, never>('myScript', () => ({
    scriptInput: {
      key: 'myScript',
      src: '/myScript.js',
    },
    scriptOptions: {
      use() {
        return {
          myScript: window.myScript,
        }
      },
    },
  }))
}
