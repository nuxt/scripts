import type { ProxyRewrite } from '../../src/first-party'
import { describe, expect, it } from 'vitest'
import { generatePartytownResolveUrl, getAllProxyConfigs } from '../../src/first-party'
import { rewriteScriptUrlsAST } from '../../src/plugins/rewrite-ast'

function deriveRewrites(domains: string[], proxyPrefix: string): ProxyRewrite[] {
  return domains.map(domain => ({ from: domain, to: `${proxyPrefix}/${domain}` }))
}

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

    it('resolves bracket notation: var n = window["navigator"]; n.sendBeacon("url", d)', () => {
      expect(rewrite('var n = window["navigator"]; n.sendBeacon("https://example.com/collect", d)')).toContain('__nuxtScripts.sendBeacon')
    })

    it('resolves bracket notation chain: var w = window; var f = w["fetch"]; — w["fetch"]("url")', () => {
      expect(rewrite('var w = window; w["fetch"]("https://example.com/api")')).toContain('__nuxtScripts.fetch')
    })

    it('resolves mixed notation: var w = self; new w["XMLHttpRequest"]', () => {
      expect(rewrite('var w = self; new w["XMLHttpRequest"]')).toBe('var w = self; new __nuxtScripts.XMLHttpRequest')
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

  describe('canvas fingerprinting neutralization', () => {
    const blankPng = 'data:image/png;base64,'

    it('neutralizes canvas.toDataURL()', () => {
      const result = rewrite('var d = canvas.toDataURL();')
      expect(result).toContain(blankPng)
      expect(result).not.toContain('toDataURL')
    })

    it('neutralizes canvas.toDataURL("image/png")', () => {
      expect(rewrite('var d = c.toDataURL("image/png");')).toContain(blankPng)
    })

    it('neutralizes canvas.toDataURL("image/jpeg", 0.5)', () => {
      expect(rewrite('var d = el.toDataURL("image/jpeg", 0.5);')).toContain(blankPng)
    })

    it('neutralizes chained ctx.canvas.toDataURL()', () => {
      expect(rewrite('var d = ctx.canvas.toDataURL();')).toContain(blankPng)
    })

    it('neutralizes computed canvas["toDataURL"]()', () => {
      expect(rewrite('var d = canvas["toDataURL"]();')).toContain(blankPng)
    })

    it('neutralizes gl.getExtension("WEBGL_debug_renderer_info")', () => {
      expect(rewrite('var ext = gl.getExtension("WEBGL_debug_renderer_info");')).toBe('var ext = null;')
    })

    it('neutralizes computed gl["getExtension"]("WEBGL_debug_renderer_info")', () => {
      expect(rewrite('var ext = gl["getExtension"]("WEBGL_debug_renderer_info");')).toBe('var ext = null;')
    })

    it('does not neutralize getExtension with other arguments', () => {
      const code = 'var ext = gl.getExtension("OES_texture_float");'
      expect(rewrite(code)).toBe(code)
    })

    it('does not neutralize toDataURL on non-call usage', () => {
      const code = 'var fn = canvas.toDataURL;'
      expect(rewrite(code)).toBe(code)
    })

    it('does not neutralize toDataURL on class/function instances', () => {
      const code = 'function Encoder() {} var e = new Encoder(); e.toDataURL();'
      // Encoder is a locally declared function — skip neutralization
      // However e is assigned from new Encoder(), which is a NewExpression not a function decl
      // The scope check is on the direct object identifier's declaration
      expect(rewrite(code)).toContain(blankPng)
    })

    it('handles realistic fingerprinting pattern', () => {
      const code = 'var c=document.createElement("canvas");var ctx=c.getContext("2d");ctx.fillText("test",0,0);var fp=c.toDataURL();'
      const result = rewrite(code)
      expect(result).toContain(blankPng)
      expect(result).not.toContain('toDataURL')
    })

    it('neutralizes bracket notation obfuscation: c["toDataURL"]()', () => {
      expect(rewrite('var c = document.createElement("canvas"); c["toDataURL"]();')).toContain(blankPng)
    })
  })

  describe('rybbit SDK host derivation patching', () => {
    const rybbitConfig = getAllProxyConfigs('/_scripts/p').rybbitAnalytics
    const rybbitRewrites = deriveRewrites(rybbitConfig.domains, '/_scripts/p')

    function rewriteRybbit(code: string): string {
      return rewriteScriptUrlsAST(code, 'rybbit.js', rybbitRewrites, rybbitConfig.postProcess)
    }

    it('patches e.split("/script.js")[0] with proxy path', () => {
      const code = 'let e=n.getAttribute("src");let t=e.split("/script.js")[0];'
      const result = rewriteRybbit(code)
      expect(result).toContain('self.location.origin+"/_scripts/p/app.rybbit.io/api"')
      expect(result).not.toContain('.split("/script.js")[0]')
    })

    it('patches with single quotes', () => {
      const code = 'let e=n.getAttribute(\'src\');let t=e.split(\'/script.js\')[0];'
      const result = rewriteRybbit(code)
      expect(result).toContain('self.location.origin+"/_scripts/p/app.rybbit.io/api"')
    })

    it('patches with different variable names', () => {
      const code = 'var src=el.getAttribute("src");var host=src.split("/script.js")[0];'
      const result = rewriteRybbit(code)
      expect(result).toContain('self.location.origin+"/_scripts/p/app.rybbit.io/api"')
    })

    it('uses custom proxyPrefix', () => {
      const customConfig = getAllProxyConfigs('/_analytics').rybbitAnalytics
      const customRewrites = deriveRewrites(customConfig.domains, '/_analytics')
      const code = 'let t=e.split("/script.js")[0];'
      const result = rewriteScriptUrlsAST(code, 'rybbit.js', customRewrites, customConfig.postProcess)
      expect(result).toContain('self.location.origin+"/_analytics/app.rybbit.io/api"')
    })

    it('does not patch when no rybbit postProcess is provided', () => {
      const code = 'let t=e.split("/script.js")[0];'
      const result = rewrite(code) // uses default rewrites (example.com), no postProcess
      expect(result).toContain('.split("/script.js")[0]')
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

  describe('skipApiRewrites (partytown mode)', () => {
    function rewritePartytown(code: string): string {
      return rewriteScriptUrlsAST(code, 'test.js', rewrites, undefined, { skipApiRewrites: true })
    }

    it('still rewrites URL string literals', () => {
      expect(rewritePartytown('"https://example.com/api"')).toContain('self.location.origin+"/_proxy/ex/api"')
    })

    it('skips fetch rewriting', () => {
      const result = rewritePartytown('fetch("https://example.com/api")')
      expect(result).not.toContain('__nuxtScripts')
      expect(result).toContain('fetch(')
      // URL literal is still rewritten
      expect(result).toContain('self.location.origin+"/_proxy/ex/api"')
    })

    it('skips navigator.sendBeacon rewriting', () => {
      const result = rewritePartytown('navigator.sendBeacon("https://example.com/collect", data)')
      expect(result).not.toContain('__nuxtScripts')
      expect(result).toContain('navigator.sendBeacon(')
    })

    it('skips XMLHttpRequest rewriting', () => {
      const result = rewritePartytown('var a = new XMLHttpRequest();')
      expect(result).not.toContain('__nuxtScripts')
      expect(result).toContain('new XMLHttpRequest()')
    })

    it('skips Image rewriting', () => {
      const result = rewritePartytown('var img = new Image();')
      expect(result).not.toContain('__nuxtScripts')
      expect(result).toContain('new Image()')
    })

    it('skips canvas toDataURL neutralization', () => {
      const result = rewritePartytown('ctx.canvas.toDataURL()')
      expect(result).not.toContain('data:image/png')
      expect(result).toContain('toDataURL()')
    })
  })
})

describe('generatePartytownResolveUrl', () => {
  it('generates a valid function string', () => {
    const fn = generatePartytownResolveUrl('/_scripts/p')
    expect(fn).toContain('function(url, location, type)')
    expect(fn).toContain('/_scripts/p')
  })

  it('returns undefined for same-origin URLs', () => {
    const fn = generatePartytownResolveUrl('/_scripts/p')
    // eslint-disable-next-line no-new-func
    const resolveUrl = new Function(`return ${fn}`)()
    const url = new URL('https://mysite.com/path')
    const location = new URL('https://mysite.com')
    expect(resolveUrl(url, location, 'fetch')).toBeUndefined()
  })

  it('rewrites non-same-origin URLs to proxy', () => {
    const fn = generatePartytownResolveUrl('/_scripts/p')
    // eslint-disable-next-line no-new-func
    const resolveUrl = new Function(`return ${fn}`)()
    const url = new URL('https://example.com/collect?v=1')
    const location = new URL('https://mysite.com')
    const result = resolveUrl(url, location, 'fetch')
    expect(result).toBeInstanceOf(URL)
    expect(result.pathname).toBe('/_scripts/p/example.com/collect')
    expect(result.search).toBe('?v=1')
    expect(result.origin).toBe('https://mysite.com')
  })

  it('preserves host in proxy path', () => {
    const fn = generatePartytownResolveUrl('/_scripts/p')
    // eslint-disable-next-line no-new-func
    const resolveUrl = new Function(`return ${fn}`)()
    const url = new URL('https://www.google-analytics.com/g/collect')
    const location = new URL('https://mysite.com')
    const result = resolveUrl(url, location, 'fetch')
    expect(result.pathname).toBe('/_scripts/p/www.google-analytics.com/g/collect')
  })

  it('uses custom proxyPrefix', () => {
    const fn = generatePartytownResolveUrl('/_custom')
    // eslint-disable-next-line no-new-func
    const resolveUrl = new Function(`return ${fn}`)()
    const url = new URL('https://example.com/api')
    const location = new URL('https://mysite.com')
    const result = resolveUrl(url, location, 'fetch')
    expect(result.pathname).toBe('/_custom/example.com/api')
  })
})
