export default defineNuxtPlugin(() => {
  const errors: string[] = []
  const warnings: string[] = []

  const overlay = document.createElement('div')
  overlay.id = 'error-overlay'
  Object.assign(overlay.style, {
    position: 'fixed',
    bottom: '12px',
    right: '12px',
    zIndex: '99999',
    fontFamily: 'monospace',
    fontSize: '13px',
    cursor: 'pointer',
    userSelect: 'none',
  })

  const tooltip = document.createElement('div')
  tooltip.id = 'error-overlay-tooltip'
  Object.assign(tooltip.style, {
    position: 'fixed',
    bottom: '52px',
    right: '12px',
    zIndex: '99998',
    background: '#1a1a2e',
    color: '#e0e0e0',
    border: '1px solid #333',
    borderRadius: '8px',
    padding: '12px',
    maxWidth: '500px',
    maxHeight: '300px',
    overflow: 'auto',
    fontFamily: 'monospace',
    fontSize: '12px',
    display: 'none',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  })

  document.body.appendChild(overlay)
  document.body.appendChild(tooltip)

  function render() {
    const e = errors.length
    const w = warnings.length
    const total = e + w

    if (total === 0) {
      overlay.style.background = '#16a34a'
      overlay.style.color = 'white'
      overlay.style.padding = '8px 14px'
      overlay.style.borderRadius = '20px'
      overlay.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)'
      overlay.textContent = '0 issues'
      return
    }

    const parts: string[] = []
    if (e > 0) parts.push(`${e} err`)
    if (w > 0) parts.push(`${w} warn`)

    overlay.style.background = e > 0 ? '#dc2626' : '#ca8a04'
    overlay.style.color = 'white'
    overlay.style.padding = '8px 14px'
    overlay.style.borderRadius = '20px'
    overlay.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)'
    overlay.textContent = parts.join(' | ')
  }

  overlay.addEventListener('click', () => {
    if (tooltip.style.display === 'none') {
      const lines: string[] = []
      for (const msg of errors) lines.push(`[ERR] ${msg}`)
      for (const msg of warnings) lines.push(`[WARN] ${msg}`)
      tooltip.textContent = lines.length > 0 ? lines.join('\n') : 'No issues'
      tooltip.style.display = 'block'
    }
    else {
      tooltip.style.display = 'none'
    }
  })

  const origError = console.error
  const origWarn = console.warn

  function safeStringify(a: unknown): string {
    if (typeof a === 'string') return a
    try { return JSON.stringify(a) }
    catch { return String(a) }
  }

  console.error = (...args: unknown[]) => {
    errors.push(args.map(safeStringify).join(' '))
    render()
    origError.apply(console, args)
  }

  console.warn = (...args: unknown[]) => {
    warnings.push(args.map(safeStringify).join(' '))
    render()
    origWarn.apply(console, args)
  }

  window.addEventListener('error', (event) => {
    errors.push(event.message || String(event.error))
    render()
  })

  window.addEventListener('unhandledrejection', (event) => {
    errors.push(`Unhandled rejection: ${event.reason}`)
    render()
  })

  // detect third-party domain requests (scripts, fetch, XHR, images, etc.)
  const currentOrigin = window.location.origin
  const seenThirdPartyDomains = new Set<string>()

  const origFetch = window.fetch
  window.fetch = (...args: Parameters<typeof fetch>) => {
    const url = typeof args[0] === 'string' ? args[0] : args[0] instanceof URL ? args[0].href : args[0] instanceof Request ? args[0].url : ''
    reportIfThirdParty(url)
    return origFetch.apply(window, args)
  }

  const origXhrOpen = XMLHttpRequest.prototype.open
  XMLHttpRequest.prototype.open = function (...args: Parameters<XMLHttpRequest['open']>) {
    const url = args[1]
    if (typeof url === 'string') reportIfThirdParty(url)
    else if (url instanceof URL) reportIfThirdParty(url.href)
    return origXhrOpen.apply(this, args)
  }

  // observe DOM for script/img/link/iframe elements with third-party src
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue
        const el = node as Element
        checkElement(el)
        for (const child of el.querySelectorAll('[src],[href]'))
          checkElement(child)
      }
    }
  })

  function checkElement(el: Element) {
    const src = el.getAttribute('src') || (el.tagName === 'LINK' ? el.getAttribute('href') : '')
    if (src) reportIfThirdParty(src)
  }

  function reportIfThirdParty(url: string) {
    if (!url || url.startsWith('data:') || url.startsWith('blob:')) return
    try {
      const parsed = new URL(url, currentOrigin)
      if (parsed.origin !== currentOrigin && !seenThirdPartyDomains.has(parsed.origin)) {
        seenThirdPartyDomains.add(parsed.origin)
        errors.push(`Third-party request: ${parsed.origin} (${url.slice(0, 120)})`)
        render()
      }
    }
    catch {}
  }

  observer.observe(document.documentElement, { childList: true, subtree: true })
  // check elements already in DOM
  for (const el of document.querySelectorAll('[src],[href]'))
    checkElement(el)

  render()
})
