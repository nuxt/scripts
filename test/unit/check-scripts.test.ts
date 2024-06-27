import { describe, it, expect } from 'vitest'
import checkScripts from '../../src/plugins/check-scripts'

const plugin = checkScripts().vite()

describe('ts file', () => {
  const id = 'test.ts'

  it('expect to throw', async () => {
    const code = `
        import { useScript } from 'nuxt-scripts'
        interface SomeInterface {}
        export default defineComponent({
        async setup(){
            const { $script } = useScript('google-analytics')
            await $script.load()

            return {}
        }
        })
        `
    expect((plugin as any).transform(code, id)).rejects.toThrow()
  })
  it('expect to not throw', () => {
    const code = `
        import { useScript } from 'nuxt-scripts'
        interface SomeInterface {}
        export default defineComponent({
        setup(){
            const { $script } = useScript('google-analytics')
            $script.load()

            return {}
        }
        })
        `
    expect((plugin as any).transform(code, id)).resolves.toBeUndefined()
  })
})

describe('js file', () => {
  const id = 'test.js'

  it('expect to throw', () => {
    const code = `
        import { useScript } from 'nuxt-scripts'
        export default defineComponent({
        setup(){
            const { $script } = useScript('google-analytics')
            await $script.load()

            return {}
        }
        })
        `
    expect((plugin as any).transform(code, id)).rejects.toThrow()
  })
  it('expect to not throw', () => {
    const code = `
        import { useScript } from 'nuxt-scripts'
        export default defineComponent({
        setup(){
            const { $script } = useScript('google-analytics')
            $script.load()

            return {}
        }
        })
        `
    expect((plugin as any).transform(code, id)).resolves.toBeUndefined()
  })
})

describe('SFC file', () => {
  const id = 'test.vue'
  it('expect to throw', () => {
    const code = `
<template><div>hello world</div></template>
<script setup lang="ts">
const { $script } = useScript('google-analytics')
await $script.load()
</script>`

    expect((plugin as any).transform(code, id)).rejects.toThrow()
  })
  it('expect notto throw', () => {
    const code = `
<template><div>hello world</div></template>
<script setup lang="ts">
const { $script } = useScript('google-analytics')
$script.load()
</script>`

    expect((plugin as any).transform(code, id)).resolves.toBeUndefined()
  })
})
