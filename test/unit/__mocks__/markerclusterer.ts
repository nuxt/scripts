import { vi } from 'vitest'

export const MarkerClusterer = vi.fn(function (this: any, options: any) {
  this.addMarker = vi.fn()
  this.removeMarker = vi.fn()
  this.setMap = vi.fn()
  this.addListener = vi.fn()
  this.render = vi.fn()
  Object.assign(this, options)
  return this
}) as unknown as (new (options: any) => any) & ReturnType<typeof vi.fn>

// Mock the entire module
const mockMarkerClusterer = { MarkerClusterer }

export default mockMarkerClusterer
