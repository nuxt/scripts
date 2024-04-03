import { useScript } from '#imports'

export function mockFallbackScript(name: string, module: string) {
  console.error(`${name} is provided by ${module}. Check your console to install it or run 'npx nuxi@latest module add ${module}'`)
  return useScript('', { trigger: 'manual' })
}
