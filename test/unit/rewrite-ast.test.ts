import type { ProxyRewrite } from '../../packages/script/src/runtime/types'
import { describe, expect, it } from 'vitest'
import { rewriteScriptUrlsAST } from '../../packages/script/src/plugins/rewrite-ast'
import { buildProxyConfigsFromRegistry, generatePartytownResolveUrl, registry } from '../../packages/script/src/registry'

let _proxyConfigs: ReturnType<typeof buildProxyConfigsFromRegistry> | undefined
async function getProxyConfigs() {
  if (!_proxyConfigs)
    _proxyConfigs = buildProxyConfigsFromRegistry(await registry())
  return _proxyConfigs
}

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
    async function getRybbitConfig() {
      const configs = await getProxyConfigs()
      return configs.rybbitAnalytics
    }

    it('patches e.split("/script.js")[0] with proxy path', async () => {
      const rybbitConfig = await getRybbitConfig()
      const rybbitRewrites = deriveRewrites(rybbitConfig.domains, '/_scripts/p')
      const code = 'let e=n.getAttribute("src");let t=e.split("/script.js")[0];'
      const result = rewriteScriptUrlsAST(code, 'rybbit.js', rybbitRewrites, rybbitConfig.sdkPatches)
      expect(result).toContain('self.location.origin+"/_scripts/p/app.rybbit.io/api"')
      expect(result).not.toContain('.split("/script.js")[0]')
    })

    it('patches with single quotes', async () => {
      const rybbitConfig = await getRybbitConfig()
      const rybbitRewrites = deriveRewrites(rybbitConfig.domains, '/_scripts/p')
      const code = 'let e=n.getAttribute(\'src\');let t=e.split(\'/script.js\')[0];'
      const result = rewriteScriptUrlsAST(code, 'rybbit.js', rybbitRewrites, rybbitConfig.sdkPatches)
      expect(result).toContain('self.location.origin+"/_scripts/p/app.rybbit.io/api"')
    })

    it('patches with different variable names', async () => {
      const rybbitConfig = await getRybbitConfig()
      const rybbitRewrites = deriveRewrites(rybbitConfig.domains, '/_scripts/p')
      const code = 'var src=el.getAttribute("src");var host=src.split("/script.js")[0];'
      const result = rewriteScriptUrlsAST(code, 'rybbit.js', rybbitRewrites, rybbitConfig.sdkPatches)
      expect(result).toContain('self.location.origin+"/_scripts/p/app.rybbit.io/api"')
    })

    it('uses custom proxyPrefix', async () => {
      const customConfig = (await getProxyConfigs()).rybbitAnalytics
      const customRewrites = deriveRewrites(customConfig.domains, '/_analytics')
      const code = 'let t=e.split("/script.js")[0];'
      const result = rewriteScriptUrlsAST(code, 'rybbit.js', customRewrites, customConfig.sdkPatches)
      expect(result).toContain('self.location.origin+"/_analytics/app.rybbit.io/api"')
    })

    it('does not patch when no sdkPatches are provided', () => {
      const code = 'let t=e.split("/script.js")[0];'
      const result = rewrite(code) // uses default rewrites (example.com), no sdkPatches
      expect(result).toContain('.split("/script.js")[0]')
    })
  })

  describe('snapchat SDK config host patching', () => {
    async function getSnapchatConfig() {
      const configs = await getProxyConfigs()
      return configs.snapchatPixel
    }

    it('pins bundled script host detection to sc-static.net', () => {
      const patches = [{ type: 'replace-new-url-host' as const, host: 'sc-static.net' }]
      const code = 'var xe=y((function(){return new URL(S).host}),s);'
      const result = rewriteScriptUrlsAST(code, 'scevent.min.js', [], patches)
      expect(result).toContain('return "sc-static.net"')
      expect(result).not.toContain('new URL(S).host')
    })

    it('rewrites the self-hosted config loader branch to the proxy path', async () => {
      const snapchatConfig = await getSnapchatConfig()
      const snapchatRewrites = deriveRewrites(snapchatConfig.domains, '/_scripts/p')
      const code = [
        'function qr(t){var e={src:t};}',
        'var xe=y((function(){return new URL(S).host}),s);',
        'function De(t,n,r,e){return void 0===n&&(n=4),e?v+e+t:r?v+xe+t:v+"tr"+"."+l+t}',
        'var i="/config/no/id.js?v=3.59.0";',
        'qr(xe!==s?v+xe+i:De(i));',
      ].join('')
      const result = rewriteScriptUrlsAST(code, 'scevent.min.js', snapchatRewrites, snapchatConfig.sdkPatches)
      expect(result).toContain('return "sc-static.net"')
      expect(result).toContain('qr(self.location.origin+"/_scripts/p/tr.snapchat.com"+i);')
      expect(result).not.toContain('v+xe+i:De(i)')
    })

    it('rewrites the nested production config loader branch to the proxy path', async () => {
      const snapchatConfig = await getSnapchatConfig()
      const snapchatRewrites = deriveRewrites(snapchatConfig.domains, '/_scripts/p')
      const code = [
        'function qr(t){var e={src:t};}',
        'var xe=y((function(){return new URL(S).host}),s);',
        'function De(t,n,r,e){return void 0===n&&(n=4),e?v+e+t:r?v+xe+t:v+"tr"+(ce()?"-shadow":6===n?"6":"")+"."+l+t}',
        'var pa="/config",r=pa+"/"+n+"/"+t,i=r+".js"+e,a=r+".json"+e;',
        '$n(xe,"localhost")?qr(De(i)):C?Sa(t,a):qr(xe!==s?v+xe+i:De(i));',
      ].join('')
      const result = rewriteScriptUrlsAST(code, 'scevent.min.js', snapchatRewrites, snapchatConfig.sdkPatches)
      expect(result).toContain('return "sc-static.net"')
      expect(result).toContain('qr(self.location.origin+"/_scripts/p/tr.snapchat.com"+i);')
      expect(result).not.toContain('xe!==s?v+xe+i:De(i)')
    })

    it('does not depend on Snapchat minified variable or loader names', async () => {
      const snapchatConfig = await getSnapchatConfig()
      const snapchatRewrites = deriveRewrites(snapchatConfig.domains, '/_scripts/p')
      const code = [
        'function loadScript(url){importScripts(url);}',
        'var scriptHost=y((function(){return new URL(stackUrl).hostname}),fallbackHost);',
        'function makeUrl(path,mode,useDetected,override){return override?proto+override+path:useDetected?proto+scriptHost+path:proto+"tr"+"."+snapDomain+path}',
        'var base="/config",path=base+"/"+tld+"/"+pixel,jsPath=path+".js"+version;',
        'loadScript(scriptHost!==fallbackHost?proto+scriptHost+jsPath:makeUrl(jsPath));',
      ].join('')
      const result = rewriteScriptUrlsAST(code, 'scevent.min.js', snapchatRewrites, snapchatConfig.sdkPatches)
      expect(result).toContain('return "sc-static.net"')
      expect(result).toContain('loadScript(self.location.origin+"/_scripts/p/tr.snapchat.com"+jsPath);')
      expect(result).not.toContain('scriptHost!==fallbackHost?proto+scriptHost+jsPath:makeUrl(jsPath)')
    })
  })

  describe('generic script-loader URL patching', () => {
    it('rewrites obfuscated script loader URLs by configured path prefix', () => {
      const patches = [
        { type: 'replace-script-loader-url' as const, fromDomain: 'config.example.com', pathPrefix: '/settings' },
      ]
      const configRewrites = deriveRewrites(['config.example.com'], '/_scripts/p')
      const code = [
        'function load(u){var s=document.createElement("script");s.src=u;}',
        'var base="/settings",path=base+"/"+tenant+"/"+id+".js";',
        'load(host!==cdn?proto+host+path:buildVendorUrl(path));',
      ].join('')
      const result = rewriteScriptUrlsAST(code, 'vendor.js', configRewrites, patches)
      expect(result).toContain('load(self.location.origin+"/_scripts/p/config.example.com"+path);')
      expect(result).not.toContain('host!==cdn?proto+host+path:buildVendorUrl(path)')
    })

    it('does not rewrite matching path variables passed to non-loader functions', () => {
      const patches = [
        { type: 'replace-script-loader-url' as const, fromDomain: 'config.example.com', pathPrefix: '/settings' },
      ]
      const configRewrites = deriveRewrites(['config.example.com'], '/_scripts/p')
      const code = [
        'function log(u){console.log(u);}',
        'var base="/settings",path=base+"/"+tenant+"/"+id+".js";',
        'log(host!==cdn?proto+host+path:buildVendorUrl(path));',
      ].join('')
      const result = rewriteScriptUrlsAST(code, 'vendor.js', configRewrites, patches)
      expect(result).toBe(code)
    })

    it('keeps minified variable names scoped when detecting path variables', () => {
      const patches = [
        { type: 'replace-script-loader-url' as const, fromDomain: 'config.example.com', pathPrefix: '/settings' },
      ]
      const configRewrites = deriveRewrites(['config.example.com'], '/_scripts/p')
      const code = [
        'function load(u){var s=document.createElement("script");s.src=u;}',
        'var p=proto+cdn+"/sdk.js";',
        'load(p+"?u="+id);',
        'function init(){var p="/settings/"+tenant+"/"+id+".js";load(host!==cdn?proto+host+p:buildVendorUrl(p));}',
      ].join('')
      const result = rewriteScriptUrlsAST(code, 'vendor.js', configRewrites, patches)
      expect(result).toContain('load(p+"?u="+id);')
      expect(result).toContain('load(self.location.origin+"/_scripts/p/config.example.com"+p);')
    })

    it('keeps minified loader function names scoped', () => {
      const patches = [
        { type: 'replace-script-loader-url' as const, fromDomain: 'config.example.com', pathPrefix: '/settings' },
      ]
      const configRewrites = deriveRewrites(['config.example.com'], '/_scripts/p')
      const code = [
        'function load(u){console.log(u);}',
        'var path="/settings/"+tenant+"/"+id+".js";',
        'load(path);',
        'function init(){function load(u){var s=document.createElement("script");s.src=u;}load(host!==cdn?proto+host+path:buildVendorUrl(path));}',
      ].join('')
      const result = rewriteScriptUrlsAST(code, 'vendor.js', configRewrites, patches)
      expect(result).toContain('load(path);')
      expect(result).toContain('load(self.location.origin+"/_scripts/p/config.example.com"+path);')
    })

    it('keeps function-expression loader declarations distinct in the same var statement', () => {
      const patches = [
        { type: 'replace-script-loader-url' as const, fromDomain: 'config.example.com', pathPrefix: '/settings' },
      ]
      const configRewrites = deriveRewrites(['config.example.com'], '/_scripts/p')
      const code = [
        'var load=function(u){var s=document.createElement("script");s.src=u},log=function(u){console.log(u)};',
        'var path="/settings/"+tenant+"/"+id+".js";',
        'load(host!==cdn?proto+host+path:buildVendorUrl(path));',
        'log(path);',
      ].join('')
      const result = rewriteScriptUrlsAST(code, 'vendor.js', configRewrites, patches)
      expect(result).toContain('load(self.location.origin+"/_scripts/p/config.example.com"+path);')
      expect(result).toContain('log(path);')
    })

    it('does not treat wrapper functions as loaders based on nested functions', () => {
      const patches = [
        { type: 'replace-script-loader-url' as const, fromDomain: 'config.example.com', pathPrefix: '/settings' },
      ]
      const configRewrites = deriveRewrites(['config.example.com'], '/_scripts/p')
      const code = [
        'function wrapper(u){function nested(){var s=document.createElement("script");s.src=u}return nested;}',
        'var path="/settings/"+tenant+"/"+id+".js";',
        'wrapper(path);',
      ].join('')
      const result = rewriteScriptUrlsAST(code, 'vendor.js', configRewrites, patches)
      expect(result).toBe(code)
    })

    it('handles loader args containing proxied domain literals without conflicting edits', () => {
      const patches = [
        { type: 'replace-script-loader-url' as const, fromDomain: 'config.example.com', pathPrefix: '/settings' },
      ]
      const configRewrites = deriveRewrites(['config.example.com'], '/_scripts/p')
      // The literal inside the replaced arg would also match the domain rewrite —
      // the loader rewrite must not leave a nested edit for it to conflict with.
      const code = [
        'function load(u){var s=document.createElement("script");s.src=u;}',
        'var path="/settings/"+tenant+"/"+id+".js";',
        'load(cond?"https://config.example.com/settings/fallback.js":path);',
      ].join('')
      const result = rewriteScriptUrlsAST(code, 'vendor.js', configRewrites, patches)
      expect(result).toContain('load(self.location.origin+"/_scripts/p/config.example.com"+path);')
    })

    it('rewrites to the patch whose pathPrefix actually matched', () => {
      const patches = [
        { type: 'replace-script-loader-url' as const, fromDomain: 'other.example.com', pathPrefix: '/alpha' },
        { type: 'replace-script-loader-url' as const, fromDomain: 'config.example.com', pathPrefix: '/settings' },
      ]
      const configRewrites = deriveRewrites(['other.example.com', 'config.example.com'], '/_scripts/p')
      const code = [
        'function load(u){var s=document.createElement("script");s.src=u;}',
        'var path="/settings/"+tenant+"/"+id+".js";',
        'load(host!==cdn?proto+host+path:buildVendorUrl(path));',
      ].join('')
      const result = rewriteScriptUrlsAST(code, 'vendor.js', configRewrites, patches)
      expect(result).toContain('load(self.location.origin+"/_scripts/p/config.example.com"+path);')
      expect(result).not.toContain('other.example.com')
    })
  })

  describe('fathom SDK self-hosted detection patching', () => {
    // Fathom is bundle-only (no proxy capability) — sdkPatches come from
    // BundleCapability.sdkPatches and are self-contained with their own domain.
    const fathomPatches = [{ type: 'neutralize-domain-check' as const, domain: 'cdn.usefathom.com' }]

    it('neutralizes .indexOf("cdn.usefathom.com") < 0', () => {
      const code = 'if(e.src.indexOf("cdn.usefathom.com")<0){t="custom"}'
      const result = rewriteScriptUrlsAST(code, 'fathom.js', [], fathomPatches)
      expect(result).toContain('<-1')
      expect(result).not.toContain('<0')
    })

    it('neutralizes with whitespace around operator', () => {
      const code = 'if(e.src.indexOf("cdn.usefathom.com") < 0){t="custom"}'
      const result = rewriteScriptUrlsAST(code, 'fathom.js', [], fathomPatches)
      expect(result).toContain('< -1')
      expect(result).not.toContain('< 0')
    })

    it('does not neutralize indexOf for non-matching domains', () => {
      const code = 'if(e.indexOf("other.com")<0){}'
      const result = rewriteScriptUrlsAST(code, 'fathom.js', [], fathomPatches)
      expect(result).toContain('<0')
    })

    it('does not neutralize without sdkPatches', () => {
      const code = 'if(e.src.indexOf("example.com")<0){}'
      const result = rewrite(code)
      expect(result).toContain('<0')
    })
  })

  describe('split protocol+URL concatenation', () => {
    it('rewrites "https:" + "//example.com/api" as a single expression', () => {
      const result = rewrite('var u = "https:" + "//example.com/api"')
      expect(result).toContain('self.location.origin+"/_proxy/ex/api"')
      expect(result).not.toContain('"https:"')
    })

    it('rewrites "http:" + "//example.com/api" as a single expression', () => {
      const result = rewrite('var u = "http:" + "//example.com/api"')
      expect(result).toContain('self.location.origin+"/_proxy/ex/api"')
      expect(result).not.toContain('"http:"')
    })

    it('does not collapse when left operand is not a protocol string', () => {
      const result = rewrite('var u = prefix + "//example.com/api"')
      expect(result).toContain('self.location.origin+"/_proxy/ex/api"')
      // prefix variable should still be there (not collapsed)
      expect(result).toContain('prefix')
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
