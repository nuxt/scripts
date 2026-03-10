import type { InferInput } from '#nuxt-scripts-validator'
import type { RegistryScriptInput } from '#nuxt-scripts/types'
import { joinURL } from 'ufo'
import { useRegistryScript } from '../utils'
import { IntercomOptions } from './schemas'

export { IntercomOptions }

export type IntercomInput = RegistryScriptInput<typeof IntercomOptions, true, false, false>

export interface IntercomApi {
  Intercom: ((event: 'boot', data?: InferInput<typeof IntercomOptions>) => void)
    & ((event: 'shutdown') => void)
    & ((event: 'update', options?: InferInput<typeof IntercomOptions>) => void)
    & ((event: 'hide') => void)
    & ((event: 'show') => void)
    & ((event: 'showSpace', spaceName: 'home' | 'messages' | 'help' | 'news' | 'tasks' | 'tickets' | (string & {})) => void)
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
    & ((event: (string & {}), ...params: any[]) => void)
}

declare global {
  interface Window extends IntercomApi {
    intercomSettings?: any
  }
}

export function useScriptIntercom<T extends IntercomApi>(_options?: IntercomInput) {
  return useRegistryScript<T, typeof IntercomOptions>('intercom', options => ({
    scriptInput: {
      src: joinURL(`https://widget.intercom.io/widget`, options?.app_id || ''),
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
