import { describe, expect, it } from 'vitest'
import { rewriteScriptUrlsAST } from '../../src/plugins/rewrite-ast'

const rewrites = [
  { from: 'example.com', to: '/_proxy/ex' },
]

function rewrite(code: string): string {
  return rewriteScriptUrlsAST(code, 'test.js', rewrites)
}

describe('rewriteScriptUrlsAST', () => {
  describe('xMLHttpRequest interception', () => {
    it('rewrites new XMLHttpRequest', () => {
      expect(rewrite('var a = new XMLHttpRequest;')).toBe('var a = new __nuxtScripts.XMLHttpRequest;')
    })

    it('rewrites new XMLHttpRequest()', () => {
      expect(rewrite('var a = new XMLHttpRequest();')).toBe('var a = new __nuxtScripts.XMLHttpRequest();')
    })

    it('rewrites new w.XMLHttpRequest where w = window', () => {
      expect(rewrite('var w = window; var g = new w.XMLHttpRequest;')).toBe('var w = window; var g = new __nuxtScripts.XMLHttpRequest;')
    })

    it('rewrites new self.XMLHttpRequest', () => {
      expect(rewrite('var g = new self.XMLHttpRequest;')).toBe('var g = new __nuxtScripts.XMLHttpRequest;')
    })

    it('rewrites new window.XMLHttpRequest()', () => {
      expect(rewrite('var g = new window.XMLHttpRequest();')).toBe('var g = new __nuxtScripts.XMLHttpRequest();')
    })

    it('rewrites computed new w["XMLHttpRequest"] where w = window', () => {
      expect(rewrite('var w = window; new w["XMLHttpRequest"]')).toBe('var w = window; new __nuxtScripts.XMLHttpRequest')
    })
  })

  describe('image interception', () => {
    it('rewrites new Image', () => {
      expect(rewrite('var i = new Image;')).toBe('var i = new __nuxtScripts.Image;')
    })

    it('rewrites new Image()', () => {
      expect(rewrite('var i = new Image();')).toBe('var i = new __nuxtScripts.Image();')
    })

    it('rewrites new Image(1,1)', () => {
      expect(rewrite('var e = new Image(1,1);')).toBe('var e = new __nuxtScripts.Image(1,1);')
    })

    it('rewrites (new Image).src inline', () => {
      expect(rewrite('(new Image).src = "url";')).toBe('(new __nuxtScripts.Image).src = "url";')
    })

    it('rewrites new w.Image where w = self', () => {
      expect(rewrite('var w = self; var i = new w.Image(1,1);')).toBe('var w = self; var i = new __nuxtScripts.Image(1,1);')
    })
  })

  describe('scope-resolved aliases', () => {
    it('resolves var w = window; w.fetch("url")', () => {
      expect(rewrite('var w = window; w.fetch("https://example.com/api")')).toContain('__nuxtScripts.fetch')
    })

    it('resolves var Rc = navigator; Rc.sendBeacon("url", d)', () => {
      expect(rewrite('var Rc = navigator; Rc.sendBeacon("https://example.com/collect", d)')).toContain('__nuxtScripts.sendBeacon')
    })

    it('resolves var w = window; new w.XMLHttpRequest', () => {
      expect(rewrite('var w = window; new w.XMLHttpRequest')).toBe('var w = window; new __nuxtScripts.XMLHttpRequest')
    })

    it('resolves var w = self; new w.Image(1,1)', () => {
      expect(rewrite('var w = self; new w.Image(1,1)')).toBe('var w = self; new __nuxtScripts.Image(1,1)')
    })

    it('resolves chained alias: var a = window; var b = a; b.fetch("url")', () => {
      expect(rewrite('var a = window; var b = a; b.fetch("https://example.com/api")')).toContain('__nuxtScripts.fetch')
    })

    it('resolves var n = window.navigator; n.sendBeacon("url", d)', () => {
      expect(rewrite('var n = window.navigator; n.sendBeacon("https://example.com/collect", d)')).toContain('__nuxtScripts.sendBeacon')
    })
  })

  describe('heuristic for unresolvable references', () => {
    it('rewrites function param sendBeacon: (function(Ke) { Ke.sendBeacon("url", d) })(navigator)', () => {
      expect(rewrite('(function(Ke) { Ke.sendBeacon("https://example.com/collect", d) })(navigator)')).toContain('__nuxtScripts.sendBeacon')
    })
  })

  describe('negative cases — should NOT rewrite locally declared names', () => {
    it('does not rewrite locally declared fetch', () => {
      const code = 'function fetch(url) { return url; } fetch("test")'
      expect(rewrite(code)).not.toContain('__nuxtScripts')
    })

    it('does not rewrite locally declared Image class', () => {
      const code = 'class Image {} new Image()'
      expect(rewrite(code)).not.toContain('__nuxtScripts')
    })

    it('does not rewrite locally declared XMLHttpRequest', () => {
      const code = 'var XMLHttpRequest = function() {}; new XMLHttpRequest()'
      expect(rewrite(code)).not.toContain('__nuxtScripts')
    })
  })

  describe('existing transforms still work', () => {
    it('rewrites fetch', () => {
      expect(rewrite('fetch("https://example.com/api")')).toContain('__nuxtScripts.fetch')
    })

    it('rewrites navigator.sendBeacon', () => {
      expect(rewrite('navigator.sendBeacon("https://example.com/collect", data)')).toContain('__nuxtScripts.sendBeacon')
    })
  })
})
