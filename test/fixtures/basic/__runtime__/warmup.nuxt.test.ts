import { it, expect, describe } from 'vitest'
import { createHead } from '@unhead/vue'
import { renderSSRHead } from '@unhead/ssr'
import { useScript } from '#imports'

describe('script warmup', () => {
  it('default', async () => {
    const head = createHead()
    const script = useScript({
      src: '/preload.js',
    }, {
      head,
    })
    const ssr = await renderSSRHead(head)
    expect(ssr.headTags).toMatchInlineSnapshot(`"<link fetchpriority="low" as="script" href="/preload.js" rel="preload">"`)
    script.remove()
  })
  it('preload relative', async () => {
    const head = createHead()
    const script = useScript({
      src: '/preload.js',
    }, {
      trigger: 'manual',
      warmupStrategy: 'preload',
      head,
    })
    const ssr = await renderSSRHead(head)
    expect(ssr.headTags).toMatchInlineSnapshot(`"<link fetchpriority="low" as="script" href="/preload.js" rel="preload">"`)
    script.remove()
  })
  it('preconnect relative', async () => {
    const head = createHead()
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
    const head = createHead()
    const script = useScript({
      src: 'https://example.com/preconnect.js',
    }, {
      trigger: 'manual',
      warmupStrategy: 'preconnect',
      head,
    })
    const ssr = await renderSSRHead(head)
    expect(ssr.headTags).toMatchInlineSnapshot(`"<link fetchpriority="low" crossorigin="anonymous" referrerpolicy="no-referrer" href="https:example.com" rel="preconnect">"`)
    script.remove()
  })
  it('preload abs', async () => {
    const head = createHead()
    const script = useScript({
      src: 'https://example.com/preload.js',
    }, {
      trigger: 'manual',
      warmupStrategy: 'preload',
      head,
    })
    const ssr = await renderSSRHead(head)
    expect(ssr.headTags).toMatchInlineSnapshot(`"<link fetchpriority="low" as="script" crossorigin="anonymous" referrerpolicy="no-referrer" href="https://example.com/preload.js" rel="preload">"`)
    script.remove()
  })
  it('respects useScript privacy controls', async () => {
    const head = createHead()
    const script = useScript({
      src: 'https://s.kk-resources.com/leadtag.js',
      crossorigin: 'use-credentials',
      referrerpolicy: 'no-referrer-when-downgrade',
    }, {
      head,
    })
    const ssr = await renderSSRHead(head)
    expect(ssr.headTags).toMatchInlineSnapshot(`"<link fetchpriority="low" as="script" crossorigin="use-credentials" referrerpolicy="no-referrer-when-downgrade" href="https://s.kk-resources.com/leadtag.js" rel="preload">"`)
    script.remove()
  })
  it('respects useScript privacy controls - #293', async () => {
    const head = createHead()
    const script = useScript({
      src: 'https://s.kk-resources.com/leadtag.js',
      async: true,
      crossorigin: false,
    }, {
      head,
    })
    const ssr = await renderSSRHead(head)
    expect(ssr.headTags).toMatchInlineSnapshot(`"<link fetchpriority="low" as="script" referrerpolicy="no-referrer" href="https://s.kk-resources.com/leadtag.js" rel="preload">"`)
    script.remove()
  })
})
