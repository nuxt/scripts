import { useRequestHeader } from '#imports'

const doNotTrackEnabledValues = [
  // account for all browsers and their different values
  '1', // W3C standard
  'yes', // old standard
  'true', // old standard
]

export function isDoNotTrackEnabled() {
  if (import.meta.server)
    return doNotTrackEnabledValues.includes(useRequestHeader('DNT') || '')
  return doNotTrackEnabledValues.includes(window.navigator.doNotTrack || '')
}
