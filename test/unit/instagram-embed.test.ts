import { ELEMENT_NODE, parse, renderSync, walkSync } from 'ultrahtml'
import { describe, expect, it } from 'vitest'
import {
  isEmbedShell,
  proxyImageUrl,
  rewriteUrl,
  rewriteUrlsInText,
  sanitizeInstagramEmbedHtml,
  scopeCss,
} from '../../packages/script/src/runtime/server/utils/instagram-embed'

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

describe('instagram-embed: HTML sanitization', () => {
  it('drops active markup, unsafe attributes, and untrusted URLs', () => {
    const html = `
      <html>
        <head>
          <link rel="stylesheet" href="https://static.cdninstagram.com/rsrc.php/embed.css">
          <link rel="stylesheet" href="https://attacker.example/embed.css">
          <script nonce="abc123">alert(1)</script>
          <style>:root { --color: red; }</style>
        </head>
        <body>
          <iframe src="https://attacker.example/frame"></iframe>
          <object data="https://attacker.example/plugin"></object>
          <form action="https://attacker.example/collect"><input name="password"></form>
          <custom-widget onclick="alert(1)">unsafe custom element</custom-widget>
          <img src="javascript:alert(1)" alt="  " onerror="alert(1)" data-log-event="track">
          <a class="Likes" href="javascript:alert(1)" target="_self" onclick="alert(1)"><i></i></a>
          <p style="background-image: url(https://attacker.example/pixel); padding-bottom: 50%">Safe text</p>
        </body>
      </html>
    `

    const result = sanitizeInstagramEmbedHtml(html)

    expect(result.cssUrls).toEqual(['https://static.cdninstagram.com/rsrc.php/embed.css'])
    expect(result.bodyHtml).not.toMatch(/<(?:script|style|iframe|object|form|input|custom-widget)\b/)
    expect(result.bodyHtml).not.toContain('javascript:')
    expect(result.bodyHtml).not.toContain('onclick')
    expect(result.bodyHtml).not.toContain('onerror')
    expect(result.bodyHtml).not.toContain('attacker.example')
    expect(result.bodyHtml).not.toContain('data-log-event')
    expect(result.bodyHtml).toContain('alt="Instagram post image"')
    expect(result.bodyHtml).toContain('style="padding-bottom: 50%"')
    expect(result.bodyHtml).toContain('Safe text')
  })

  it('keeps expected Instagram content while proxying media and hardening links', () => {
    const html = `
      <body>
        <div class="Content EmbedFrame" style="padding-bottom: 125%; position: fixed" data-media-id="123">
          <a class="EmbeddedMedia" href="https://www.instagram.com/p/ABC123/" target="_self" rel="opener">
            <img class="EmbeddedMediaImage" src="https://scontent-lax3-1.cdninstagram.com/post.jpg" alt="A sunset" onload="track()">
          </a>
        </div>
      </body>
    `

    const { bodyHtml } = sanitizeInstagramEmbedHtml(html)

    expect(bodyHtml).toContain('class="Content EmbedFrame"')
    expect(bodyHtml).toContain('style="padding-bottom: 125%"')
    expect(bodyHtml).not.toContain('position: fixed')
    expect(bodyHtml).not.toContain('data-media-id')
    expect(bodyHtml).toContain('href="https://www.instagram.com/p/ABC123/"')
    expect(bodyHtml).toContain('target="_blank"')
    expect(bodyHtml).toContain('rel="noopener noreferrer"')
    expect(bodyHtml).toContain('/_scripts/embed/instagram-image?url=')
    expect(bodyHtml).toContain('alt="A sunset"')
    expect(bodyHtml).not.toContain('onload')
  })

  it('gives every image a non-empty alt and names Instagram action links', () => {
    const html = `
      <body>
        <img src="https://lookaside.instagram.com/profile.jpg">
        <img src="https://lookaside.instagram.com/post.jpg" alt="  ">
        <img src="https://lookaside.instagram.com/named.jpg" alt="Existing description">
        <a class="Likes" href="https://www.instagram.com/p/ABC123/"><i></i></a>
        <a class="Comments" href="https://www.instagram.com/p/ABC123/"><i></i></a>
        <a class="Share" href="https://www.instagram.com/p/ABC123/"><i></i></a>
        <a class="Save" href="https://www.instagram.com/p/ABC123/"><i></i></a>
        <a class="Likes" href="https://www.instagram.com/p/ABC123/" aria-label="Custom likes label"><i></i></a>
      </body>
    `

    const { bodyHtml } = sanitizeInstagramEmbedHtml(html)
    const ast = parse(bodyHtml)
    const imageAlts: string[] = []
    const linkLabels: string[] = []
    walkSync(ast, (node) => {
      if (node.type !== ELEMENT_NODE)
        return
      if (node.name === 'img')
        imageAlts.push(node.attributes.alt)
      if (node.name === 'a')
        linkLabels.push(node.attributes['aria-label'])
    })

    expect(imageAlts).toEqual([
      'Instagram post image',
      'Instagram post image',
      'Existing description',
    ])
    expect(linkLabels).toEqual([
      'View likes on Instagram',
      'Comment on Instagram',
      'Share this post on Instagram',
      'Save this post on Instagram',
      'Custom likes label',
    ])
  })

  it('keeps only valid Instagram media entries in srcset', () => {
    const html = `
      <img
        srcset="https://scontent-a.cdninstagram.com/a.jpg 320w, https://attacker.example/b.jpg 640w, javascript:alert(1) 1280w"
        src="https://scontent-a.cdninstagram.com/a.jpg"
      >
    `

    const { bodyHtml } = sanitizeInstagramEmbedHtml(html)

    expect(bodyHtml.match(/\/_scripts\/embed\/instagram-image/g)).toHaveLength(2)
    expect(bodyHtml).toContain('320w')
    expect(bodyHtml).not.toContain('640w')
    expect(bodyHtml).not.toContain('1280w')
    expect(bodyHtml).not.toContain('attacker.example')
    expect(bodyHtml).not.toContain('javascript:')
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

  it('preserves statement-form @layer declarations', () => {
    const css = '@layer reset, components; .Embed { color: red; }'
    const result = scopeCss(css, scope)
    expect(result).toContain('@layer reset, components;')
    expect(result).not.toMatch(/@layer[^;]*\}/)
    expect(result).toContain(`${scope} .Embed`)
  })

  it('does not split commas inside :is() / :where() / :not() selectors', () => {
    const css = ':is(.Embed, .EmbedMedia) > :not(span, em) { color: red; }'
    const result = scopeCss(css, scope)
    expect(result).toContain(`${scope} :is(.Embed, .EmbedMedia) > :not(span, em)`)
    expect(result).not.toMatch(/\.EmbedMedia\) > :not\(span$/m)
  })

  it('does not split commas inside attribute selectors', () => {
    const css = '[data-x="a,b"] .Embed { color: red; }'
    const result = scopeCss(css, scope)
    expect(result).toContain(`${scope} [data-x="a,b"] .Embed`)
  })
})

describe('instagram-embed: isEmbedShell', () => {
  it('detects JS-only shell with splash-screen and no post markup', () => {
    const html = '<body><div id="splash-screen"></div><div id="has-finished-comet-page"></div></body>'
    expect(isEmbedShell(html)).toBe(true)
  })

  it('accepts real SSR\'d post even when shell sentinels appear elsewhere', () => {
    // Some Instagram responses include the comet sentinel alongside real content.
    const html = '<body><a class="EmbeddedMedia"><img class="EmbeddedMediaImage" /></a><div id="has-finished-comet-page"></div></body>'
    expect(isEmbedShell(html)).toBe(false)
  })

  it('accepts real post with Embed wrapper', () => {
    const html = '<div class="Embed" data-media-id="123"><div>content</div></div>'
    expect(isEmbedShell(html)).toBe(false)
  })

  it('returns false on unrelated HTML (no shell sentinels)', () => {
    expect(isEmbedShell('<html><body>nothing here</body></html>')).toBe(false)
  })

  it('detects post content inside multi-class lists', () => {
    // Real Instagram responses include splash-screen alongside the SSR'd post;
    // multi-class lists like `class="post EmbeddedMedia foo"` must count.
    const html = '<div id="splash-screen"></div><div class="post EmbeddedMedia foo"></div>'
    expect(isEmbedShell(html)).toBe(false)
  })

  it('detects post content with single-quoted class attribute', () => {
    const html = `<div id='splash-screen'></div><a class='EmbeddedMedia'></a>`
    expect(isEmbedShell(html)).toBe(false)
  })

  it('does not match Embed inside an unrelated class token (word boundary)', () => {
    // `EmbedSomething` should not count as post content.
    const html = '<div id="splash-screen"></div><div class="NotAnEmbedThing"></div>'
    expect(isEmbedShell(html)).toBe(true)
  })
})
