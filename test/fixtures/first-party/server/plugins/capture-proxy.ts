import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

// Use NUXT_SCRIPTS_CAPTURE_DIR env var or default to rootDir/.captures
const captureDir = process.env.NUXT_SCRIPTS_CAPTURE_DIR || join(process.cwd(), '.captures')

export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook('nuxt-scripts:proxy', (data: any) => {
    // Ensure dir exists before each write (handles race conditions)
    mkdirSync(captureDir, { recursive: true })
    const filename = join(captureDir, `capture-${data.timestamp}.json`)
    writeFileSync(filename, JSON.stringify(data, null, 2))
  })
})
