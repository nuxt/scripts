import { expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import GoogleMaps from './GoogleMaps'

vi.mock('#imports', () => ({ useStyles: () => vi.importActual('../../../../nuxt-script/src/runtime/composables/useStyles') }))

it('should mount the component', async () => {
  const component = await mountSuspended(GoogleMaps, {
    props: {
      apiKey: 'API_KEY',
      q: 'Brooklyn+Bride,New+York+NY',
    },
  })

  expect(component.html()).toContain('google-maps-container')
})
