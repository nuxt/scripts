import { describe, expect, it } from 'vitest'

// Duplicated from module.ts since it's not exported
const SELF_CLOSING_SCRIPT_RE = /<((?:Script[A-Z]|script-)\w[\w-]*)\b([^>]*?)\s*\/\s*>/g

function expandTags(content: string): string | null {
  SELF_CLOSING_SCRIPT_RE.lastIndex = 0
  if (!SELF_CLOSING_SCRIPT_RE.test(content)) return null
  SELF_CLOSING_SCRIPT_RE.lastIndex = 0
  return content.replace(SELF_CLOSING_SCRIPT_RE, '<$1$2></$1>')
}

describe('self-closing Script* tag expansion (#613)', () => {
  it('expands self-closing PascalCase Script* tags', () => {
    const input = '<ScriptYouTubePlayer video-id="abc" />'
    expect(expandTags(input)).toBe('<ScriptYouTubePlayer video-id="abc"></ScriptYouTubePlayer>')
  })

  it('expands self-closing kebab-case script-* tags', () => {
    const input = '<script-youtube-player video-id="abc" />'
    expect(expandTags(input)).toBe('<script-youtube-player video-id="abc"></script-youtube-player>')
  })

  it('expands tags with no space before />', () => {
    const input = '<ScriptYouTubePlayer video-id="abc"/>'
    expect(expandTags(input)).toBe('<ScriptYouTubePlayer video-id="abc"></ScriptYouTubePlayer>')
  })

  it('expands tags with no attributes', () => {
    const input = '<ScriptYouTubePlayer />'
    expect(expandTags(input)).toBe('<ScriptYouTubePlayer></ScriptYouTubePlayer>')
  })

  it('does not affect <script> tags', () => {
    expect(expandTags('<script setup>\nconsole.log()\n</script>')).toBeNull()
  })

  it('does not affect <Script> alone', () => {
    expect(expandTags('<Script />')).toBeNull()
  })

  it('does not affect non-script components', () => {
    expect(expandTags('<MyComponent />')).toBeNull()
  })

  it('does not affect already-expanded Script* tags', () => {
    expect(expandTags('<ScriptYouTubePlayer video-id="abc"></ScriptYouTubePlayer>')).toBeNull()
  })

  it('handles multiple self-closing Script* tags', () => {
    const input = '<ScriptYouTubePlayer video-id="a" />\n<ScriptGoogleMaps />'
    expect(expandTags(input)).toBe('<ScriptYouTubePlayer video-id="a"></ScriptYouTubePlayer>\n<ScriptGoogleMaps></ScriptGoogleMaps>')
  })

  it('handles Vue binding syntax in attributes', () => {
    const input = '<ScriptYouTubePlayer :video-id="videoId" @ready="onReady" />'
    expect(expandTags(input)).toBe('<ScriptYouTubePlayer :video-id="videoId" @ready="onReady"></ScriptYouTubePlayer>')
  })

  it('fixes Nuxt SFC_SCRIPT_RE extraction for self-closing tags', () => {
    // Simulate Nuxt's buggy regex (case-insensitive)
    const SFC_SCRIPT_RE = /<script(?<attrs>[^>]*)>(?<content>[\s\S]*?)<\/script[^>]*>/gi

    const brokenSfc = `<template>
  <div>
    <ScriptYouTubePlayer video-id="dQw4w9WgXcQ" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dark',
})
</script>`

    // Without fix: regex consumes ScriptYouTubePlayer's /> through to real </script>
    const brokenMatches = [...brokenSfc.matchAll(SFC_SCRIPT_RE)]
    const brokenScriptContents = brokenMatches.map(m => m.groups?.content?.trim())
    // The extracted "script content" contains HTML garbage
    expect(brokenScriptContents.some(c => c?.includes('</template>'))).toBe(true)

    // With fix: expanded tags give the regex a proper closing tag
    const fixedSfc = expandTags(brokenSfc)!
    const fixedMatches = [...fixedSfc.matchAll(SFC_SCRIPT_RE)]
    const fixedScriptContents = fixedMatches.map(m => m.groups?.content?.trim())
    // Now the real script block is correctly extracted
    expect(fixedScriptContents).toContain('definePageMeta({\n  layout: \'dark\',\n})')
  })
})
