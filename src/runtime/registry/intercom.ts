import { type Input, literal, number, object, optional, string, union } from 'valibot'
import { joinURL } from 'ufo'
import { useScript, validateScriptInputSchema } from '#imports'
import type { NuxtUseScriptIntegrationOptions, NuxtUseScriptOptions, ScriptDynamicSrcInput } from '#nuxt-scripts'

export const IntercomOptions = object({
  app_id: string(),
  api_base: optional(union([literal('https://api-iam.intercom.io'), literal('https://api-iam.eu.intercom.io'), literal('https://api-iam.au.intercom.io')])),
  name: optional(string()),
  email: optional(string()),
  user_id: optional(string()),
  // customizing the messenger
  alignment: optional(union([literal('left'), literal('right')])),
  horizontal_padding: optional(number()),
  vertical_padding: optional(number()),
})

export type IntercomInput = ScriptDynamicSrcInput<typeof IntercomOptions>

export interface IntercomApi {
  Intercom: ((event: 'boot', data?: Input<typeof IntercomOptions>) => void)
  & ((event: 'shutdown') => void)
  & ((event: 'update', options?: Input<typeof IntercomOptions>) => void)
  & ((event: 'hide') => void)
  & ((event: 'show') => void)
  & ((event: 'showSpace', spaceName: 'home' | 'messages' | 'help' | 'news' | 'tasks' | 'tickets' | string) => void)
  & ((event: 'showMessages') => void)
  & ((event: 'showNewMessage', content?: string) => void)
  & ((event: 'onHide', fn: () => void) => void)
  & ((event: 'onShow', fn: () => void) => void)
  & ((event: 'onUnreadCountChange', fn: () => void) => void)
  & ((event: 'trackEvent', eventName: string, metadata?: Record<string, any>) => void)
  & ((event: 'getVisitorId') => Promise<string>)
  & ((event: 'startTour', tourId: string | number) => void)
  & ((event: 'showArticle', articleId: string | number) => void)
  & ((event: 'showNews', newsItemId: string | number) => void)
  & ((event: 'startSurvey', surveyId: string | number) => void)
  & ((event: 'startChecklist', checklistId: string | number) => void)
  & ((event: 'showTicket', ticketId: string | number) => void)
  & ((event: 'showConversation', conversationId: string | number) => void)
  & ((event: 'onUserEmailSupplied', fn: () => void) => void)
  & ((event: string, ...params: any[]) => void)
}

declare global {
  interface Window extends IntercomApi {
    intercomSettings?: IntercomInput
  }
}

export function useScriptIntercom<T extends IntercomApi>(options?: IntercomInput, _scriptOptions?: NuxtUseScriptIntegrationOptions) {
  const scriptOptions: NuxtUseScriptOptions<T> = _scriptOptions || {}
  scriptOptions.beforeInit = () => {
    import.meta.dev && validateScriptInputSchema(IntercomOptions, options)
    // we need to insert the hj function
    if (import.meta.client)
      window.intercomSettings = options
    scriptOptions.beforeInit?.()
  }
  return useScript<T>({
    key: 'intercom',
    src: options?.src || joinURL(`https://widget.intercom.io/widget`, options?.app_id || ''),
  }, {
    ...scriptOptions,
    use() {
      return { Intercom: window.Intercom }
    },
  })
}
