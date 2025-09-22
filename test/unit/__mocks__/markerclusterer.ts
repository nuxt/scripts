import { vi } from 'vitest'

export const MarkerClusterer = vi.fn().mockImplementation(options => ({
  addMarker: vi.fn(),
  removeMarker: vi.fn(),
  setMap: vi.fn(),
  addListener: vi.fn(),
  render: vi.fn(),
  ...options,
}))

// Mock the entire module
const mockMarkerClusterer = { MarkerClusterer }

export default mockMarkerClusterer
