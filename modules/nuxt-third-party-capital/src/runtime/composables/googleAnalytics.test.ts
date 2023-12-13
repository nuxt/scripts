import { expect, it } from 'vitest'
import { createHead, setHeadInjectionHandler } from '@unhead/vue'
import { useGoogleAnalytics } from './googleAnalytics'

it('should add a Google Analytics entry in the head', () => {
  const head = createHead()
  setHeadInjectionHandler(() => head)

  const id = 'ga-xxxxxxxxx-x'
  useGoogleAnalytics({ id })

  expect(head.headEntries()[0]).toEqual(expect.objectContaining({ id }))
})

it('should throw an error if "id" is not passed in', () => {
  const head = createHead()
  setHeadInjectionHandler(() => head)

  expect(() => useGoogleAnalytics({})).toThrowError('[Nuxt Scripts] google-analytics is missing required options: id')
})
