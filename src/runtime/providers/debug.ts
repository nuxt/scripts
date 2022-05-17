// import { useRouter } from '#app'
import { defineScriptProvider } from '../types'

export default defineScriptProvider(() => {
  const createDebug = (tag: string) => (...args) => {
    console.log(`[scripts] [debug] [${tag}]`, ...args)
  }
  return {
    onNavigation: createDebug('onNavigation'),
    render: () => {
      return {
        script: [{ children: 'window._nuxtScriptLogs = []' }]
      }
    }
  }
})
