import { createError } from 'h3'
import { vi } from 'vitest'

export function stubNitroRuntime(stubs: Record<string, unknown>) {
  for (const [name, stub] of Object.entries({ createError, ...stubs }))
    vi.stubGlobal(name, stub)
}
