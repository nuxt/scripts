import { vi } from 'vitest'

export function stubNitroRuntime(stubs: Record<string, unknown>) {
  for (const [name, stub] of Object.entries(stubs))
    vi.stubGlobal(name, stub)
}
