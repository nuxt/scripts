import { joinURL } from 'ufo'
import { registryScript } from '../utils'
import { type Input, literal, number, object, optional, string, union } from '#nuxt-scripts-validator'
import type { RegistryScriptInput } from '#nuxt-scripts'

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

export type IntercomInput = RegistryScriptInput<typeof IntercomOptions>

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

export function useScriptIntercom<T extends IntercomApi>(_options?: IntercomInput) {
  return registryScript<T, typeof IntercomOptions>('intercom', options => ({
    scriptInput: {
      src: joinURL(`https://widget.intercom.io/widget`, options?.app_id || ''),
      // append the data attr's
      ...Object.entries(options)
        .filter(([key]) => key.startsWith('data-'))
        .reduce((acc, [key, value]) => {
          // @ts-expect-error untyped
          acc[key] = value
          return acc
        }),
    },
    schema: import.meta.dev ? IntercomOptions : undefined,
    scriptOptions: {
      use() {
        return { Intercom: window.Intercom }
      },
    },
    clientInit: import.meta.server
      ? undefined
      : () => {
          window.intercomSettings = options
        },
  }), _options)
}
