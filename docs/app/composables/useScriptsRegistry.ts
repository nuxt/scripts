import { registry } from '../../../src/registry'

export function useScriptsRegistry() {
  return registry() // we don't need paths here
}
