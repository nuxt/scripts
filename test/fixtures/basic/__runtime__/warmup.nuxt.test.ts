import { it, expect, describe } from 'vitest'
import { renderSSRHead } from '@unhead/ssr'
import { createHeadCore } from '@unhead/vue'
import { useScript } from '#imports'

describe.skipIf(process.env.CI)('script warmup', () => {
  it('default', async () => {
    const head = createHeadCore()
    const script = useScript({
      src: '/preload.js',
    }, {
      head,
    })
    const ssr = await renderSSRHead(head)
    expect(ssr.headTags.replace('>', '').split(' ').sort()).toMatchInlineSnapshot(`
      [
        "<link",
        "as="script"",
        "fetchpriority="low"",
        "href="/preload.js"",
        "rel="preload"",
      ]
    `)
    script.remove()
  })
  it('preload relative', async () => {
    const head = createHeadCore()
    const script = useScript({
      src: '/preload.js',
    }, {
      trigger: 'manual',
      warmupStrategy: 'preload',
      head,
    })
    const ssr = await renderSSRHead(head)
    expect(ssr.headTags.replace('>', '').split(' ').sort()).toMatchInlineSnapshot(`
      [
        "<link",
        "as="script"",
        "fetchpriority="low"",
        "href="/preload.js"",
        "rel="preload"",
      ]
    `)
    script.remove()
  })
  it('preconnect relative', async () => {
    const head = createHeadCore()
    const script = useScript({
      src: '/preconnect.js',
    }, {
      trigger: 'manual',
      warmupStrategy: 'preconnect',
      head,
    })
    const ssr = await renderSSRHead(head)
    expect(ssr.headTags).toMatchInlineSnapshot(`""`)
    script.remove()
  })
  it('preconnect abs', async () => {
    const head = createHeadCore()
    const script = useScript({
      src: 'https://example.com/preconnect.js',
    }, {
      trigger: 'manual',
      warmupStrategy: 'preconnect',
      head,
    })
    const ssr = await renderSSRHead(head)
    expect(ssr.headTags.replace('>', '').split(' ').sort()).toMatchInlineSnapshot(`
      [
        "<link",
        "crossorigin="anonymous"",
        "fetchpriority="low"",
        "href="https:example.com"",
        "referrerpolicy="no-referrer"",
        "rel="preconnect"",
      ]
    `)
    script.remove()
  })
  it('preload abs', async () => {
    const head = createHeadCore()
    const script = useScript({
      src: 'https://example.com/preload.js',
    }, {
      trigger: 'manual',
      warmupStrategy: 'preload',
      head,
    })
    const ssr = await renderSSRHead(head)
    expect(ssr.headTags.replace('>', '').split(' ').sort()).toMatchInlineSnapshot(`
      [
        "<link",
        "as="script"",
        "crossorigin="anonymous"",
        "fetchpriority="low"",
        "href="https://example.com/preload.js"",
        "referrerpolicy="no-referrer"",
        "rel="preload"",
      ]
    `)
    script.remove()
  })
  it('respects useScript privacy controls', async () => {
    const head = createHeadCore()
    const script = useScript({
      src: 'https://s.kk-resources.com/leadtag.js',
      crossorigin: 'use-credentials',
      referrerpolicy: 'no-referrer-when-downgrade',
    }, {
      head,
    })
    const ssr = await renderSSRHead(head)
    expect(ssr.headTags.replace('>', '').split(' ').sort()).toMatchInlineSnapshot(`
      [
        "<link",
        "as="script"",
        "crossorigin="use-credentials"",
        "fetchpriority="low"",
        "href="https://s.kk-resources.com/leadtag.js"",
        "referrerpolicy="no-referrer-when-downgrade"",
        "rel="preload"",
      ]
    `)
    script.remove()
  })
  it('respects useScript privacy controls - #293', async () => {
    const head = createHeadCore()
    const script = useScript({
      src: 'https://s.kk-resources.com/leadtag.js',
      async: true,
      crossorigin: false,
    }, {
      head,
    })
    const ssr = await renderSSRHead(head)
    expect(ssr.headTags.replace('>', '').split(' ').sort()).toMatchInlineSnapshot(`
      [
        "<link",
        "as="script"",
        "fetchpriority="low"",
        "href="https://s.kk-resources.com/leadtag.js"",
        "referrerpolicy="no-referrer"",
        "rel="preload"",
      ]
    `)
    script.remove()
  })
})
