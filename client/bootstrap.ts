import { createResolver, defineNuxtModule } from '@nuxt/kit'
import { startSubprocess } from '@nuxt/devtools-kit'
import { DEVTOOLS_UI_LOCAL_PORT } from '../src/devtools'

const resolver = createResolver(import.meta.url)

console.log({ port: DEVTOOLS_UI_LOCAL_PORT })

process.env.PORT = DEVTOOLS_UI_LOCAL_PORT

export default defineNuxtModule((_, nuxt) => {
  if (!nuxt.options.dev || !nuxt.options.modules?.includes('@nuxt/scripts'))
    return

  const subprocess = startSubprocess(
    {
      command: 'npx',
      args: ['nuxi', 'dev', '--port', DEVTOOLS_UI_LOCAL_PORT],
      cwd: resolver.resolve('.'),
    },
    {
      id: 'nuxt-devtools:scripts-client',
      name: 'Nuxt DevTools Scripts Client',
    },
  )
  subprocess.getProcess().stdout?.on('data', (data) => {
    // eslint-disable-next-line no-console
    console.log(` - devtools: ${data.toString()}`)
  })
  subprocess.getProcess().stderr?.on('data', (data) => {
    console.error(` - devtools: ${data.toString()}`)
  })
})
