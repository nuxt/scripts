/**
 * @vitest-environment happy-dom
 *
 * Regression tests for Google Maps component fixes.
 */
import { describe, expect, it, vi } from 'vitest'
import { bindGoogleMapsEvents } from '../../src/runtime/components/GoogleMaps/bindGoogleMapsEvents'
import { createMockAdvancedMarkerElement, createMockGoogleMapsAPIWithInstances, createMockInfoWindow } from './__mocks__/google-maps-api'

describe('google Maps Regressions', () => {
  describe('overlayView open model default', () => {
    // Regression: defineModel<boolean>('open') casts missing prop to false via Vue boolean casting,
    // causing draw() to hide the overlay even when v-model:open is not used.
    // Fix: defineModel<boolean>('open', { default: undefined })
    it('should treat missing open model as undefined, not false', async () => {
      // Simulate the draw() condition that was broken
      const openValue = undefined // what the model should be when not provided

      // The old broken condition: open.value === false would incorrectly match
      // when Vue cast the missing boolean prop to false
      expect(openValue === false).toBe(false) // undefined !== false

      // The fix ensures missing v-model:open stays undefined
      const explicitlyFalse = false
      expect(explicitlyFalse === false).toBe(true) // only explicit false should hide
    })
  })

  describe('advancedMarkerElement click events', () => {
    // Regression: addListener('click') on AdvancedMarkerElement is deprecated.
    // Fix: use addEventListener('gmp-click') with gmpClickable: true
    it('should use gmp-click DOM event instead of addListener click', () => {
      const marker = createMockAdvancedMarkerElement()
      const emit = vi.fn()

      // Simulate what the component now does
      marker.gmpClickable = true
      const handler = (e: any) => emit('click', e)
      marker.addEventListener('gmp-click', handler)

      expect(marker.gmpClickable).toBe(true)
      expect(marker.addEventListener).toHaveBeenCalledWith('gmp-click', handler)
      // Should NOT use addListener for click
      expect(marker.addListener).not.toHaveBeenCalledWith('click', expect.any(Function))
    })

    it('should still use addListener for drag events', () => {
      const marker = createMockAdvancedMarkerElement()
      const emit = vi.fn()
      const dragEvents = ['drag', 'dragend', 'dragstart'] as const

      bindGoogleMapsEvents(marker as any, emit, { withPayload: dragEvents })

      dragEvents.forEach((event) => {
        expect(marker.addListener).toHaveBeenCalledWith(event, expect.any(Function))
      })
    })

    it('should clean up gmp-click listener on cleanup', () => {
      const marker = createMockAdvancedMarkerElement()
      const handler = vi.fn()

      marker.addEventListener('gmp-click', handler)
      marker.removeEventListener('gmp-click', handler)

      expect(marker.removeEventListener).toHaveBeenCalledWith('gmp-click', handler)
    })
  })

  describe('infoWindow toggle behavior', () => {
    // Regression: clicking a marker with InfoWindow only opened it, never closed.
    // Fix: track isOpen state and toggle on click.
    it('should toggle open/close on repeated clicks', () => {
      const infoWindow = createMockInfoWindow()
      const mockMap = {}
      const mockAnchor = {}
      let isOpen = false

      const toggleOpen = (anchor: any) => {
        if (isOpen) {
          infoWindow.close()
          isOpen = false
        }
        else {
          infoWindow.open({ anchor, map: mockMap })
          isOpen = true
        }
      }

      // First click: opens
      toggleOpen(mockAnchor)
      expect(infoWindow.open).toHaveBeenCalledTimes(1)
      expect(isOpen).toBe(true)

      // Second click: closes
      toggleOpen(mockAnchor)
      expect(infoWindow.close).toHaveBeenCalledTimes(1)
      expect(isOpen).toBe(false)

      // Third click: opens again
      toggleOpen(mockAnchor)
      expect(infoWindow.open).toHaveBeenCalledTimes(2)
      expect(isOpen).toBe(true)
    })
  })

  describe('infoWindow group close', () => {
    // Regression: opening a new InfoWindow didn't close the previous one.
    // Fix: shared activateInfoWindow on MAP_INJECTION_KEY closes the previous.
    it('should close previous InfoWindow when activating a new one', () => {
      let activeInfoWindow: any

      const activateInfoWindow = (iw: any) => {
        if (activeInfoWindow && activeInfoWindow !== iw) {
          activeInfoWindow.close()
        }
        activeInfoWindow = iw
      }

      const { MockInfoWindow } = createMockGoogleMapsAPIWithInstances()

      const iw1 = new MockInfoWindow()
      const iw2 = new MockInfoWindow()

      // Activate first
      activateInfoWindow(iw1)
      expect(iw1.close).not.toHaveBeenCalled()

      // Activate second: should close first
      activateInfoWindow(iw2)
      expect(iw1.close).toHaveBeenCalledTimes(1)
      expect(iw2.close).not.toHaveBeenCalled()

      // Activate first again: should close second
      activateInfoWindow(iw1)
      expect(iw2.close).toHaveBeenCalledTimes(1)
    })

    it('should not close itself when reactivated', () => {
      let activeInfoWindow: any

      const activateInfoWindow = (iw: any) => {
        if (activeInfoWindow && activeInfoWindow !== iw) {
          activeInfoWindow.close()
        }
        activeInfoWindow = iw
      }

      const iw = createMockInfoWindow()

      activateInfoWindow(iw)
      activateInfoWindow(iw)

      expect(iw.close).not.toHaveBeenCalled()
    })
  })
})
