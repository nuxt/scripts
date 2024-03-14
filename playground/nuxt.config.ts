import { resolve } from 'node:path'
import { defineNuxtModule } from '@nuxt/kit'
import { startSubprocess } from '@nuxt/devtools-kit'

export default defineNuxtConfig({
  modules: [
    '@nuxt/scripts',
    '@nuxt/ui',
    'nuxt-icon',
    /**
     * Start a sub Nuxt Server for developing the client
     *
     * The terminal output can be found in the Terminals tab of the devtools.
     */
    defineNuxtModule({
      setup(_, nuxt) {
        if (!nuxt.options.dev)
          return

        const subprocess = startSubprocess(
          {
            command: 'npx',
            args: ['nuxi', 'dev', '--port', '3030'],
            cwd: resolve(__dirname, '../client'),
          },
          {
            id: 'nuxt-scripts:client',
            name: 'Nuxt Scripts Client Dev',
          },
        )
        subprocess.getProcess().stdout?.on('data', (data) => {
          // eslint-disable-next-line no-console
          console.log(` - devtools: ${data.toString()}`)
        })
        subprocess.getProcess().stderr?.on('data', (data) => {
          console.error(` - devtools: ${data.toString()}`)
        })

        // eslint-disable-next-line node/prefer-global/process
        process.on('exit', () => {
          subprocess.terminate()
        })
      },
    }),
  ],
  devtools: { enabled: true },
})
