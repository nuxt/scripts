import { describe, expect, it } from 'vitest'

// Regression guard for the LinkedIn-style bug (#741) where only the first
// two args were pushed onto the queue. The Calendly stub installed by
// `clientInit` must spread *all* forwarded args so the replay later runs
// with the original signature.
//
// We can't import `useScriptCalendly` directly here (it relies on Nuxt
// runtime context); instead we re-implement the same stub shape and assert
// its behaviour. Keep this in sync with `runtime/registry/calendly.ts`.
describe('calendly stub queue', () => {
  function createStub() {
    const queue: unknown[] = []
    return {
      q: queue,
      initInlineWidget(...args: unknown[]) {
        queue.push(['initInlineWidget', ...args])
      },
      initPopupWidget(...args: unknown[]) {
        queue.push(['initPopupWidget', ...args])
      },
      initBadgeWidget(...args: unknown[]) {
        queue.push(['initBadgeWidget', ...args])
      },
      initPopupWidgetWithText(...args: unknown[]) {
        queue.push(['initPopupWidgetWithText', ...args])
      },
      showPopupWidget(...args: unknown[]) {
        queue.push(['showPopupWidget', ...args])
      },
      closePopupWidget(...args: unknown[]) {
        queue.push(['closePopupWidget', ...args])
      },
    }
  }

  it('pushes the method name and the full options object', () => {
    const stub = createStub()
    stub.initInlineWidget({
      url: 'https://calendly.com/example/30min',
      parentElement: '#calendly-host',
    })
    expect(stub.q).toHaveLength(1)
    expect(stub.q[0]).toEqual([
      'initInlineWidget',
      {
        url: 'https://calendly.com/example/30min',
        parentElement: '#calendly-host',
      },
    ])
  })

  it('preserves multiple positional args (showPopupWidget(url, ...))', () => {
    const stub = createStub()
    stub.showPopupWidget('https://calendly.com/example/30min', { foo: 'bar' }, 42)
    expect(stub.q[0]).toEqual([
      'showPopupWidget',
      'https://calendly.com/example/30min',
      { foo: 'bar' },
      42,
    ])
  })
})
