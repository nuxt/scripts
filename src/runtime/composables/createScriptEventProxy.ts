import { useNuxtApp } from '#imports'

interface Context {
  queue: [string, Record<string, any>][]
  send: (() => void)
  debounce: null | NodeJS.Timeout
}

export function createScriptEventProxy() {
  const nuxtApp = useNuxtApp()
  const ctx = (nuxtApp._scriptsServerProxy as Context) || {
    queue: [],
    debounce: null,
    send: () => {
      // create the debounce function that will actually do the send on the idle timeout
      ctx.debounce && clearTimeout(ctx.debounce)
      ctx.debounce = setTimeout(() => {
        // send the events
        const events = ctx.queue
        ctx.queue = []
        // send the events
        console.log('send', events)
        // clear the debounce
        ctx.debounce = null
      })
    },
  } satisfies Context
  return (eventName: string, eventProperties: Record<string, any> = {}) => {
    ctx.queue.push([eventName, eventProperties])
    ctx.send()
  }
}
