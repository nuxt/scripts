import { ELEMENT_NODE, parse, renderSync, TEXT_NODE, walkSync } from 'ultrahtml'
import { describe, expect, it } from 'vitest'
import {
  proxyImageUrl,
  rewriteUrl,
  rewriteUrlsInText,
  scopeCss,
} from '../../src/runtime/server/instagram-embed'

describe('instagram-embed: URL rewriting', () => {
  it('proxies scontent CDN image URLs', () => {
    const url = 'https://scontent-lax3-1.cdninstagram.com/v/t51.2885-15/photo.jpg?stp=dst-jpg'
    expect(rewriteUrl(url)).toContain('/_scripts/embed/instagram-image?url=')
    expect(rewriteUrl(url)).toContain(encodeURIComponent(url))
  })

  it('proxies lookaside image URLs', () => {
    const url = 'https://lookaside.instagram.com/seo/photo.jpg'
    expect(rewriteUrl(url)).toContain('/_scripts/embed/instagram-image?url=')
  })

  it('proxies static CDN asset URLs', () => {
    const url = 'https://static.cdninstagram.com/rsrc.php/v3/some-asset.css'
    expect(rewriteUrl(url)).toContain('/_scripts/embed/instagram-asset?url=')
  })

  it('returns non-instagram URLs unchanged', () => {
    expect(rewriteUrl('https://example.com/img.png')).toBe('https://example.com/img.png')
  })

  it('returns invalid URLs unchanged', () => {
    expect(rewriteUrl('not-a-url')).toBe('not-a-url')
  })

  it('decodes &amp; in URLs before proxying', () => {
    const url = 'https://scontent-lax3-1.cdninstagram.com/photo.jpg?a=1&amp;b=2'
    const result = proxyImageUrl(url)
    expect(result).not.toContain('&amp;')
    expect(result).toContain(encodeURIComponent('a=1&b=2'))
  })
})

describe('instagram-embed: rewriteUrlsInText', () => {
  it('rewrites scontent URLs in CSS text', () => {
    const css = 'background: url(https://scontent-lax3-1.cdninstagram.com/photo.jpg);'
    const result = rewriteUrlsInText(css)
    expect(result).toContain('/_scripts/embed/instagram-image?url=')
    // The original hostname is still present but URL-encoded inside the proxy query param
    expect(result).toMatch(/\/_scripts\/embed\/instagram-image\?url=/)
  })

  it('rewrites static CDN URLs in text', () => {
    const text = 'src: url(https://static.cdninstagram.com/rsrc.php/font.woff2);'
    const result = rewriteUrlsInText(text)
    expect(result).toContain('/_scripts/embed/instagram-asset?url=')
  })

  it('rewrites multiple URLs in same text', () => {
    const text = 'url(https://scontent-a.cdninstagram.com/a.jpg) url(https://static.cdninstagram.com/b.css)'
    const result = rewriteUrlsInText(text)
    expect(result).toContain('embed/instagram-image')
    expect(result).toContain('embed/instagram-asset')
  })
})

describe('instagram-embed: srcset rewriting', () => {
  it('rewrites each URL in a multi-entry srcset', () => {
    const html = `<img srcset="https://scontent-a.cdninstagram.com/a.jpg 640w,https://scontent-b.cdninstagram.com/b.jpg 1080w" />`
    const ast = parse(html)

    walkSync(ast, (node) => {
      if (node.type === ELEMENT_NODE && node.attributes.srcset) {
        node.attributes.srcset = node.attributes.srcset
          .split(',')
          .map((entry: string) => {
            const parts = entry.trim().split(/\s+/)
            const url = parts[0]
            const descriptor = parts.slice(1).join(' ')
            return url ? `${rewriteUrl(url)}${descriptor ? ` ${descriptor}` : ''}` : entry
          })
          .join(', ')
      }
    })

    const result = renderSync(ast)
    // Each entry should be individually proxied
    expect(result).toContain('embed/instagram-image')
    // Descriptors preserved
    expect(result).toContain('640w')
    expect(result).toContain('1080w')
    // Should have two separate proxy URLs
    const proxyMatches = result.match(/\/_scripts\/embed\/instagram-image/g)
    expect(proxyMatches).toHaveLength(2)
  })

  it('handles srcset with spaces around commas', () => {
    const srcset = 'https://scontent-a.cdninstagram.com/a.jpg 640w, https://scontent-b.cdninstagram.com/b.jpg 1080w'
    const entries = srcset.split(',').map((entry: string) => {
      const parts = entry.trim().split(/\s+/)
      const url = parts[0]
      const descriptor = parts.slice(1).join(' ')
      return url ? `${rewriteUrl(url)}${descriptor ? ` ${descriptor}` : ''}` : entry
    })
    expect(entries).toHaveLength(2)
    expect(entries[0]).toContain('640w')
    expect(entries[1]).toContain('1080w')
    expect(entries.every(e => e.includes('embed/instagram-image'))).toBe(true)
  })
})

describe('instagram-embed: node removal', () => {
  it('does not produce broken HTML from removed script tags', () => {
    const html = '<div><script type="text/javascript" nonce="abc123">alert(1)</script><p>content</p></div>'
    const ast = parse(html)

    walkSync(ast, (node) => {
      if (node.type === ELEMENT_NODE && node.name === 'script') {
        node.type = TEXT_NODE
        node.value = ''
        node.name = undefined as any
        node.attributes = {}
        node.children = []
      }
    })

    const result = renderSync(ast)
    expect(result).not.toContain('nonce')
    expect(result).not.toContain('text/javascript')
    expect(result).not.toContain('<script')
    expect(result).toContain('<p>content</p>')
  })

  it('does not produce broken HTML from removed link tags', () => {
    const html = '<head><link rel="stylesheet" href="https://example.com/style.css" nonce="xyz"/></head>'
    const ast = parse(html)

    walkSync(ast, (node) => {
      if (node.type === ELEMENT_NODE && node.name === 'link') {
        node.type = TEXT_NODE
        node.value = ''
        node.name = undefined as any
        node.attributes = {}
        node.children = []
      }
    })

    const result = renderSync(ast)
    expect(result).not.toContain('nonce')
    expect(result).not.toContain('stylesheet')
    expect(result).not.toContain('<link')
    // Should just have the head tags
    expect(result).toContain('<head>')
  })

  it('removes style tags containing global CSS', () => {
    const html = '<div><style>:root { --color: red; } p { color: blue; }</style><p>text</p></div>'
    const ast = parse(html)

    walkSync(ast, (node) => {
      if (node.type === ELEMENT_NODE && node.name === 'style') {
        node.type = TEXT_NODE
        node.value = ''
        node.name = undefined as any
        node.attributes = {}
        node.children = []
      }
    })

    const result = renderSync(ast)
    expect(result).not.toContain(':root')
    expect(result).not.toContain('<style')
    expect(result).toContain('<p>text</p>')
  })
})

describe('instagram-embed: scopeCss', () => {
  const scope = '.instagram-embed-root'

  it('scopes simple selectors', () => {
    const css = '.Embed { opacity: 1; }'
    const result = scopeCss(css, scope)
    expect(result).toContain(`${scope} .Embed { opacity: 1; }`)
  })

  it('strips :root rules', () => {
    const css = ':root { --ig-color: blue; } .Embed { color: red; }'
    const result = scopeCss(css, scope)
    expect(result).not.toContain(':root')
    expect(result).toContain(`${scope} .Embed`)
  })

  it('strips html rules', () => {
    const css = 'html { font-size: 16px; } .post { margin: 0; }'
    const result = scopeCss(css, scope)
    expect(result).not.toMatch(/(?<!\.)html\s*\{/)
    expect(result).toContain(`${scope} .post`)
  })

  it('strips body rules', () => {
    const css = 'body { margin: 0; padding: 0; } .content { display: flex; }'
    const result = scopeCss(css, scope)
    expect(result).not.toMatch(/(?<!\.)body\s*\{/)
    expect(result).toContain(`${scope} .content`)
  })

  it('strips :root descendant selectors', () => {
    const css = ':root .theme-dark { color: white; } .normal { color: black; }'
    const result = scopeCss(css, scope)
    expect(result).not.toContain(':root')
    expect(result).toContain(`${scope} .normal`)
  })

  it('handles comma-separated selectors with mixed global/local', () => {
    const css = ':root, .Embed { display: block; }'
    const result = scopeCss(css, scope)
    // :root should be stripped, .Embed should be scoped
    expect(result).not.toContain(':root')
    expect(result).toContain(`${scope} .Embed`)
  })

  it('preserves @keyframes as-is', () => {
    const css = '@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }'
    const result = scopeCss(css, scope)
    expect(result).toContain('@keyframes fadeIn')
    expect(result).toContain('from { opacity: 0; }')
  })

  it('scopes rules inside @media', () => {
    const css = '@media (max-width: 600px) { .post { width: 100%; } }'
    const result = scopeCss(css, scope)
    expect(result).toContain('@media (max-width: 600px)')
    expect(result).toContain(`${scope} .post`)
  })

  it('strips @import rules', () => {
    const css = '@import url("other.css"); .Embed { color: red; }'
    const result = scopeCss(css, scope)
    expect(result).not.toContain('@import')
    expect(result).toContain(`${scope} .Embed`)
  })

  it('strips @charset rules', () => {
    const css = '@charset "UTF-8"; .Embed { color: red; }'
    const result = scopeCss(css, scope)
    expect(result).not.toContain('@charset')
    expect(result).toContain(`${scope} .Embed`)
  })

  it('handles empty CSS', () => {
    expect(scopeCss('', scope)).toBe('')
  })

  it('handles CSS with only :root rules', () => {
    const css = ':root { --color: blue; } html { margin: 0; } body { padding: 0; }'
    const result = scopeCss(css, scope)
    expect(result.trim()).toBe('')
  })

  it('handles realistic Instagram CSS snippet', () => {
    const css = `
:root { --ig-primary-text: #262626; --ig-secondary-text: #8e8e8e; }
html, body { margin: 0; padding: 0; }
.Embed { opacity: 1; position: relative; }
.EmbedFrame-module__header { display: flex; align-items: center; }
@media (max-width: 540px) { .Embed { padding: 8px; } :root { --ig-padding: 8px; } }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    `.trim()
    const result = scopeCss(css, scope)

    // Global selectors stripped
    expect(result).not.toMatch(/(?<![.\w-])(:root|html|body)\s*[,{]/)

    // Embed selectors scoped
    expect(result).toContain(`${scope} .Embed`)
    expect(result).toContain(`${scope} .EmbedFrame-module__header`)

    // @media scoped inner rules, strips :root inside
    expect(result).toContain('@media (max-width: 540px)')

    // @keyframes preserved
    expect(result).toContain('@keyframes spin')
  })
})
