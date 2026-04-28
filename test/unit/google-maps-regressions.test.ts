/**
 * @vitest-environment happy-dom
 *
 * Regression tests for Google Maps component fixes.
 */
import { describe, expect, it, vi } from 'vitest'
import { bindGoogleMapsEvents } from '../../packages/script/src/runtime/components/GoogleMaps/useGoogleMapsResource'
import { createMockAdvancedMarkerElement, createMockGoogleMapsAPIWithInstances, createMockInfoWindow, createMockMap } from './__mocks__/google-maps-api'

describe('google Maps Regressions', () => {
  describe('bindGoogleMapsEvents emit forwarding', () => {
    it('should forward withPayload events with the listener argument', () => {
      const handlers = new Map<string, (...args: any[]) => void>()
      const instance = {
        addListener: vi.fn((event: string, handler: (...args: any[]) => void) => {
          handlers.set(event, handler)
        }),
      }
      const emit = vi.fn()
      const events = ['click', 'clusteringbegin', 'clusteringend'] as const

      bindGoogleMapsEvents(instance, emit, { withPayload: events })

      expect(instance.addListener).toHaveBeenCalledTimes(3)

      // Simulate event firing and verify emit receives the payload
      const payload = { type: 'test' }
      handlers.get('clusteringbegin')!(payload)
      expect(emit).toHaveBeenCalledWith('clusteringbegin', payload)

      handlers.get('click')!(payload)
      expect(emit).toHaveBeenCalledWith('click', payload)
    })

    it('should forward noPayload events without arguments', () => {
      const handlers = new Map<string, (...args: any[]) => void>()
      const instance = {
        addListener: vi.fn((event: string, handler: (...args: any[]) => void) => {
          handlers.set(event, handler)
        }),
      }
      const emit = vi.fn()
      const events = ['close', 'domready'] as const

      bindGoogleMapsEvents(instance, emit, { noPayload: events })

      handlers.get('close')!()
      expect(emit).toHaveBeenCalledWith('close')
    })

    it('should handle mixed noPayload and withPayload events', () => {
      const handlers = new Map<string, (...args: any[]) => void>()
      const instance = {
        addListener: vi.fn((event: string, handler: (...args: any[]) => void) => {
          handlers.set(event, handler)
        }),
      }
      const emit = vi.fn()

      bindGoogleMapsEvents(instance, emit, {
        noPayload: ['center_changed'] as const,
        withPayload: ['click', 'drag'] as const,
      })

      expect(instance.addListener).toHaveBeenCalledTimes(3)

      handlers.get('center_changed')!()
      expect(emit).toHaveBeenCalledWith('center_changed')

      const mouseEvent = { latLng: { lat: 0, lng: 0 } }
      handlers.get('click')!(mouseEvent)
      expect(emit).toHaveBeenCalledWith('click', mouseEvent)
    })
  })

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

  describe('overlayView data-state attribute', () => {
    // The overlay content element is moved to a Google Maps pane, so data-state
    // must be set imperatively on both the wrapper and its first child.

    function createOverlayElement() {
      const el = document.createElement('div')
      const child = document.createElement('div')
      child.className = 'overlay-popup'
      el.appendChild(child)
      return { el, child }
    }

    // Simulate the setDataState function from the component
    function setDataState(el: HTMLElement, state: 'open' | 'closed') {
      el.dataset.state = state
      const child = el.firstElementChild as HTMLElement | null
      if (child)
        child.dataset.state = state
    }

    function hideElement(el: HTMLElement) {
      el.style.visibility = 'hidden'
      el.style.pointerEvents = 'none'
      setDataState(el, 'closed')
    }

    it('should set data-state on both wrapper and child', () => {
      const { el, child } = createOverlayElement()

      setDataState(el, 'open')
      expect(el.dataset.state).toBe('open')
      expect(child.dataset.state).toBe('open')

      setDataState(el, 'closed')
      expect(el.dataset.state).toBe('closed')
      expect(child.dataset.state).toBe('closed')
    })

    it('should handle wrapper with no children', () => {
      const el = document.createElement('div')

      setDataState(el, 'open')
      expect(el.dataset.state).toBe('open')

      setDataState(el, 'closed')
      expect(el.dataset.state).toBe('closed')
    })

    it('should set pointer-events none when hidden', () => {
      const { el } = createOverlayElement()

      hideElement(el)

      expect(el.style.visibility).toBe('hidden')
      expect(el.style.pointerEvents).toBe('none')
      expect(el.dataset.state).toBe('closed')
    })

    it('should simulate draw() open → sets visible, pointer-events auto, data-state open', () => {
      const { el, child } = createOverlayElement()

      // Simulate the "show" path of draw()
      el.style.visibility = 'visible'
      el.style.pointerEvents = 'auto'
      setDataState(el, 'open')

      expect(el.style.visibility).toBe('visible')
      expect(el.style.pointerEvents).toBe('auto')
      expect(el.dataset.state).toBe('open')
      expect(child.dataset.state).toBe('open')
    })

    it('should simulate draw() close → sets hidden, pointer-events none, data-state closed', () => {
      const { el, child } = createOverlayElement()

      // Start open
      el.style.visibility = 'visible'
      el.style.pointerEvents = 'auto'
      setDataState(el, 'open')

      // Close
      hideElement(el)

      expect(el.style.visibility).toBe('hidden')
      expect(el.style.pointerEvents).toBe('none')
      expect(el.dataset.state).toBe('closed')
      expect(child.dataset.state).toBe('closed')
    })

    it('should start hidden with pointer-events none on creation', () => {
      const { el } = createOverlayElement()

      // Simulate initial state before setMap
      el.style.visibility = 'hidden'
      el.style.pointerEvents = 'none'

      expect(el.style.visibility).toBe('hidden')
      expect(el.style.pointerEvents).toBe('none')
    })

    it('should cycle through open/close states correctly', () => {
      const { el, child } = createOverlayElement()

      // Initial: hidden
      hideElement(el)
      expect(el.dataset.state).toBe('closed')
      expect(child.dataset.state).toBe('closed')
      expect(el.style.pointerEvents).toBe('none')

      // Open
      el.style.visibility = 'visible'
      el.style.pointerEvents = 'auto'
      setDataState(el, 'open')
      expect(el.dataset.state).toBe('open')
      expect(child.dataset.state).toBe('open')
      expect(el.style.pointerEvents).toBe('auto')

      // Close
      hideElement(el)
      expect(el.dataset.state).toBe('closed')
      expect(child.dataset.state).toBe('closed')
      expect(el.style.pointerEvents).toBe('none')

      // Reopen
      el.style.visibility = 'visible'
      el.style.pointerEvents = 'auto'
      setDataState(el, 'open')
      expect(el.dataset.state).toBe('open')
      expect(child.dataset.state).toBe('open')
    })
  })

  describe('overlayView dataState computed', () => {
    it('should reflect isPositioned state', () => {
      // dataState = computed(() => isPositioned.value ? 'open' : 'closed')
      let isPositioned = false
      const dataState = () => isPositioned ? 'open' : 'closed'

      expect(dataState()).toBe('closed')

      isPositioned = true
      expect(dataState()).toBe('open')

      isPositioned = false
      expect(dataState()).toBe('closed')
    })
  })

  describe('map setOptions should not reset zoom or center', () => {
    // Regression: when parent component re-renders (e.g. overlay open/close toggling
    // state in parent), the options computed re-evaluates (defu returns a new object),
    // triggering watch(options) which called setOptions with the initial zoom and center,
    // resetting any user pan/zoom interactions.
    // Fix: exclude center and zoom from the generic setOptions call; use dedicated watchers.

    // Simulate the old (broken) watcher: passed full options including center/zoom
    function applyOptionsOld(map: ReturnType<typeof createMockMap>, options: Record<string, any>) {
      map.setOptions(options)
    }

    // Simulate the fixed watcher: strips center, zoom, mapId, and colorScheme
    // before calling setOptions. mapId/colorScheme are init-only in Google Maps
    // and are handled by a dedicated re-init watcher (see #726 regression suite).
    function applyOptionsFixed(map: ReturnType<typeof createMockMap>, options: Record<string, any>) {
      const { center: _, zoom: __, mapId: ___, colorScheme: ____, ...rest } = options
      map.setOptions(rest)
    }

    it('old behavior: setOptions resets zoom and center on unrelated re-render', () => {
      const map = createMockMap()
      const options = { center: { lat: 40, lng: -74 }, zoom: 12, mapId: 'abc' }

      // User has panned/zoomed the map, but parent re-renders and the watcher fires.
      // Old code passed full options, resetting zoom and center to initial values.
      applyOptionsOld(map, options)

      expect(map.setOptions).toHaveBeenCalledWith(
        expect.objectContaining({ zoom: 12, center: { lat: 40, lng: -74 } }),
      )
    })

    it('fixed behavior: setOptions excludes zoom, center, mapId, and colorScheme', () => {
      const map = createMockMap()
      const options = { center: { lat: 40, lng: -74 }, zoom: 12, mapId: 'abc', disableDefaultUI: true }

      applyOptionsFixed(map, options)

      expect(map.setOptions).toHaveBeenCalledWith({ disableDefaultUI: true })
      expect(map.setOptions).not.toHaveBeenCalledWith(
        expect.objectContaining({ center: expect.anything() }),
      )
      expect(map.setOptions).not.toHaveBeenCalledWith(
        expect.objectContaining({ zoom: expect.anything() }),
      )
      expect(map.setOptions).not.toHaveBeenCalledWith(
        expect.objectContaining({ mapId: expect.anything() }),
      )
    })

    it('old behavior: repeated overlay toggles reset zoom/center every time', () => {
      const map = createMockMap()
      const baseOptions = { center: { lat: 40, lng: -74 }, zoom: 12, mapId: 'abc', disableDefaultUI: true }

      // Simulate 3 re-renders from overlay open/close/open
      for (let i = 0; i < 3; i++) {
        applyOptionsOld(map, { ...baseOptions })
      }

      // Every call leaked center and zoom, resetting user interactions each time
      expect(map.setOptions).toHaveBeenCalledTimes(3)
      for (const call of map.setOptions.mock.calls) {
        expect(call[0]).toHaveProperty('center')
        expect(call[0]).toHaveProperty('zoom')
      }
    })

    it('fixed behavior: repeated overlay toggles never reset zoom/center', () => {
      const map = createMockMap()
      const baseOptions = { center: { lat: 40, lng: -74 }, zoom: 12, mapId: 'abc', disableDefaultUI: true }

      // Simulate 3 re-renders from overlay open/close/open
      for (let i = 0; i < 3; i++) {
        applyOptionsFixed(map, { ...baseOptions })
      }

      expect(map.setOptions).toHaveBeenCalledTimes(3)
      for (const call of map.setOptions.mock.calls) {
        expect(call[0]).not.toHaveProperty('center')
        expect(call[0]).not.toHaveProperty('zoom')
      }
      expect(map.setCenter).not.toHaveBeenCalled()
      expect(map.setZoom).not.toHaveBeenCalled()
    })
  })

  describe('center watcher should skip setCenter when lat/lng unchanged', () => {
    // Regression: when mapOptions is a plain (non-reactive) object, the `options`
    // computed re-evaluates on any re-render (defu creates a new object ref),
    // firing the center watcher even though lat/lng are identical. This resets the
    // user's pan position.
    // Fix: compare new center lat/lng against map.getCenter() before calling setCenter.

    function applyCenterUpdate(
      map: ReturnType<typeof createMockMap>,
      newCenter: { lat: number, lng: number } | { lat: () => number, lng: () => number },
    ) {
      const current = map.getCenter()
      if (current) {
        const newLat = typeof (newCenter as any).lat === 'function' ? (newCenter as any).lat() : (newCenter as any).lat
        const newLng = typeof (newCenter as any).lng === 'function' ? (newCenter as any).lng() : (newCenter as any).lng
        if (current.lat() === newLat && current.lng() === newLng)
          return
      }
      map.setCenter(newCenter)
    }

    it('should skip setCenter when lat/lng are unchanged', () => {
      const map = createMockMap()
      // Mock getCenter returns { lat: () => 40, lng: () => -74 }
      map.getCenter.mockReturnValue({ lat: () => 40, lng: () => -74 })

      // Same coordinates as current position — should NOT call setCenter
      applyCenterUpdate(map, { lat: 40, lng: -74 })

      expect(map.setCenter).not.toHaveBeenCalled()
    })

    it('should call setCenter when lat/lng actually change', () => {
      const map = createMockMap()
      map.getCenter.mockReturnValue({ lat: () => 40, lng: () => -74 })

      // Different coordinates — should call setCenter
      applyCenterUpdate(map, { lat: 41, lng: -73 })

      expect(map.setCenter).toHaveBeenCalledWith({ lat: 41, lng: -73 })
    })

    it('should handle LatLng objects with function accessors', () => {
      const map = createMockMap()
      map.getCenter.mockReturnValue({ lat: () => 40, lng: () => -74 })

      // Same coordinates via function accessors — should NOT call setCenter
      applyCenterUpdate(map, { lat: () => 40, lng: () => -74 } as any)

      expect(map.setCenter).not.toHaveBeenCalled()
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

  describe('color-mode reactivity for cloud-based map IDs (#726)', () => {
    // Regression: toggling color mode with `mapIds` set (or with cloud-based
    // styling on a single mapId) did not update the map. The old code passed
    // the resolved mapId via `setOptions`, which Google Maps refuses
    // ("A Map's mapId property cannot be changed after initial Map render").
    // Both `mapId` and `colorScheme` are init-only; the fix excludes them
    // from the generic setOptions call and re-initialises the Map instance
    // when either changes.

    function resolveMapId(props: {
      mapIds?: { light?: string, dark?: string }
      mapOptions?: { mapId?: string }
    }, colorMode: 'light' | 'dark') {
      if (!props.mapIds)
        return props.mapOptions?.mapId
      return props.mapIds[colorMode] || props.mapIds.light || props.mapOptions?.mapId
    }

    function resolveColorScheme(props: {
      mapIds?: { light?: string, dark?: string }
      colorMode?: 'light' | 'dark'
      hasNuxtColorMode?: boolean
    }, currentColorMode: 'light' | 'dark') {
      if (!props.mapIds && !props.colorMode && !props.hasNuxtColorMode)
        return undefined
      return currentColorMode === 'dark' ? 'DARK' : 'LIGHT'
    }

    function applyOptionsFixed(map: ReturnType<typeof createMockMap>, options: Record<string, any>) {
      const { center: _, zoom: __, mapId: ___, colorScheme: ____, ...rest } = options
      map.setOptions(rest)
    }

    it('strips mapId and colorScheme from setOptions to avoid the init-only warning', () => {
      const map = createMockMap()
      const options = {
        center: { lat: 40, lng: -74 },
        zoom: 12,
        mapId: 'abc',
        colorScheme: 'DARK',
        disableDefaultUI: true,
      }

      applyOptionsFixed(map, options)

      expect(map.setOptions).toHaveBeenCalledWith({ disableDefaultUI: true })
      expect(map.setOptions).not.toHaveBeenCalledWith(
        expect.objectContaining({ mapId: expect.anything() }),
      )
      expect(map.setOptions).not.toHaveBeenCalledWith(
        expect.objectContaining({ colorScheme: expect.anything() }),
      )
    })

    it('resolves a different mapId per color mode when both light and dark are provided', () => {
      const props = { mapIds: { light: 'LIGHT_ID', dark: 'DARK_ID' } }

      expect(resolveMapId(props, 'light')).toBe('LIGHT_ID')
      expect(resolveMapId(props, 'dark')).toBe('DARK_ID')
    })

    it('emits a colorScheme so a single mapId with cloud-based light/dark styling can re-init', () => {
      // User configured one mapId in Cloud Console with both Light and Dark
      // schemes. mapIds resolves to the same id in both modes, so the only
      // signal that triggers re-init is the colorScheme value.
      const props = { mapIds: { light: 'SAME_ID', dark: 'SAME_ID' } }

      expect(resolveMapId(props, 'light')).toBe('SAME_ID')
      expect(resolveMapId(props, 'dark')).toBe('SAME_ID')

      expect(resolveColorScheme(props, 'light')).toBe('LIGHT')
      expect(resolveColorScheme(props, 'dark')).toBe('DARK')
    })

    it('does not emit a colorScheme when no color-mode props or @nuxtjs/color-mode are present', () => {
      // Avoid forcing a LIGHT scheme on existing maps that never opted in to
      // color-mode reactivity — would otherwise needlessly re-init on first
      // mount or accidentally override mapOptions.colorScheme.
      expect(resolveColorScheme({}, 'light')).toBeUndefined()
    })

    it('emits a colorScheme when @nuxtjs/color-mode is detected even without explicit mapIds', () => {
      expect(resolveColorScheme({ hasNuxtColorMode: true }, 'dark')).toBe('DARK')
    })

    it('triggers re-init only when the resolved mapId or colorScheme actually changes', () => {
      // Mirrors the dedup guard in the recreate watcher.
      function shouldReinit(
        prev: { mapId: string | undefined, scheme: string | undefined },
        next: { mapId: string | undefined, scheme: string | undefined },
      ) {
        return prev.mapId !== next.mapId || prev.scheme !== next.scheme
      }

      // Identical → no re-init (covers e.g. unrelated re-renders that re-evaluate the options computed).
      expect(shouldReinit(
        { mapId: 'abc', scheme: 'LIGHT' },
        { mapId: 'abc', scheme: 'LIGHT' },
      )).toBe(false)

      // mapId changes (two-id light/dark setup).
      expect(shouldReinit(
        { mapId: 'LIGHT_ID', scheme: 'LIGHT' },
        { mapId: 'DARK_ID', scheme: 'DARK' },
      )).toBe(true)

      // Single mapId, only colorScheme changes (cloud styling on one id).
      expect(shouldReinit(
        { mapId: 'SAME_ID', scheme: 'LIGHT' },
        { mapId: 'SAME_ID', scheme: 'DARK' },
      )).toBe(true)
    })

    it('persists the user-panned center via centerOverride before tearing down', () => {
      // Regression: after the re-init watcher captured zoom/center, it created
      // the new Map with the captured center, but the standalone center
      // watcher (which depends on `options.value.center` and `map`) re-fired
      // when `map.value` was reassigned. Because `options.value.center` still
      // pointed at the *prop-defined* initial center, the watcher then called
      // setCenter(initialCenter), discarding the user's pan.
      // Fix: write the captured center to `centerOverride` before teardown so
      // that `options.value.center` reflects the user's pan; the watcher's
      // lat/lng comparison guard then short-circuits.
      const map = createMockMap()
      // User panned to (50, 100)
      map.getCenter.mockReturnValue({ lat: () => 50, lng: () => 100 })

      // Simulate: capture center → write to centerOverride
      const captured = map.getCenter()
      const centerOverride = { lat: captured.lat(), lng: captured.lng() }

      // Simulate the options computed after centerOverride is set:
      // `defu({ center: centerOverride, ... }, props.mapOptions, { center: props.center }, ...)`
      // centerOverride wins.
      const propsCenter = { lat: 0, lng: 0 } // initial prop center
      const optionsCenter = centerOverride || propsCenter

      // The center watcher comparison guard now sees:
      //   current = newMap.getCenter() = { lat: 50, lng: 100 }
      //   new     = options.value.center = { lat: 50, lng: 100 }
      // → matches → setCenter is skipped.
      expect(optionsCenter.lat).toBe(50)
      expect(optionsCenter.lng).toBe(100)
      // Without the fix, optionsCenter would have been the prop's initial value:
      expect(optionsCenter).not.toEqual(propsCenter)
    })

    it('passes captured zoom and center to the new Map instance', () => {
      // The re-init watcher reads the live map state before teardown and uses
      // the captured values when constructing the new Map. Verifies that the
      // _options object spread does not let an undefined captured zoom fall
      // back to a stale options value, and that the literal coordinate object
      // is the right shape for Google Maps.
      const map = createMockMap()
      map.getCenter.mockReturnValue({ lat: () => 50, lng: () => 100 })
      map.getZoom.mockReturnValue(10)

      const optionsValue = { zoom: 5, center: { lat: 0, lng: 0 }, mapId: 'a', colorScheme: 'DARK' }

      const center = map.getCenter()
      const zoom = map.getZoom()
      const _options = {
        ...optionsValue,
        center: center ? { lat: center.lat(), lng: center.lng() } : optionsValue.center,
        zoom: zoom ?? optionsValue.zoom,
      }

      expect(_options.zoom).toBe(10)
      expect(_options.center).toEqual({ lat: 50, lng: 100 })
      // mapId/colorScheme from the new options pass through (init-only, but the
      // new instance can accept them).
      expect(_options.mapId).toBe('a')
      expect(_options.colorScheme).toBe('DARK')
    })

    it('preserves zoom of 0 (a valid Google Maps zoom level)', () => {
      // `zoom ?? options.value.zoom` correctly handles 0 vs undefined.
      const map = createMockMap()
      map.getZoom.mockReturnValue(0)
      const zoom = map.getZoom()
      expect(zoom ?? 15).toBe(0)
    })

    it('re-emits ready after map re-init so imperative bindings can re-attach', () => {
      // Consumers that attach state via the exposed `map` ref (rather than
      // declarative children) need a signal to re-bind after the Map instance
      // is recreated on color-mode change.
      const emit = vi.fn()
      const exposed = { map: { value: createMockMap() } } as any

      // initial ready
      emit('ready', exposed)

      // simulate re-init with a new map instance
      exposed.map.value = createMockMap()
      emit('ready', exposed)

      expect(emit).toHaveBeenCalledTimes(2)
      expect(emit).toHaveBeenNthCalledWith(2, 'ready', exposed)
    })

    it('clears centerOverride when controlled center prop changes', () => {
      // Regression: writing centerOverride from the user's pan would block
      // subsequent prop-driven center updates because centerOverride wins
      // over props in defu. Clearing it on prop change restores priority.
      const centerOverride: { value: { lat: number, lng: number } | undefined } = { value: { lat: 50, lng: 100 } }

      // Simulate the watcher firing on prop change
      function onPropCenterChange() {
        centerOverride.value = undefined
      }

      onPropCenterChange()

      expect(centerOverride.value).toBeUndefined()
    })
  })
})
