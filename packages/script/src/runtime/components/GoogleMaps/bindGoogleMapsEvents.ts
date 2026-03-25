/**
 * Bind Google Maps event listeners that forward to Vue emit.
 *
 * Two categories:
 * - `noPayload`: emits with no arguments (state-change events like `position_changed`)
 * - `withPayload`: forwards the first argument from the listener (mouse events, etc.)
 */
export function bindGoogleMapsEvents(
  instance: { addListener: (event: string, handler: (...args: any[]) => void) => void },
  emit: (...args: any[]) => void,
  config: {
    noPayload?: readonly string[]
    withPayload?: readonly string[]
  },
) {
  config.noPayload?.forEach((event) => {
    instance.addListener(event, () => emit(event))
  })
  config.withPayload?.forEach((event) => {
    instance.addListener(event, (payload: any) => emit(event, payload))
  })
}
