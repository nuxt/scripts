import { registry } from '../../src/registry'

export function useScriptRegistry() {
  return registry() // we don't need paths here
}
