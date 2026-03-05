import { writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'
import { scriptMeta } from '../src/script-meta'

interface ScriptSizeDetail {
  url: string
  transferKb: number
  decodedKb: number
  encoding: string
  durationMs: number
  initiatorType: string
  protocol: string
}

interface ScriptSizeEntry {
  totalTransferKb: number
  totalDecodedKb: number
  loadTimeMs: number
  scripts: ScriptSizeDetail[]
}

interface CdpResponseData {
  transferSize: number
  decodedSize: number
  encoding: string
}

function round(bytes: number): number {
  return Number.parseFloat((bytes / 1024).toFixed(1))
}

function buildHtml(urls: string[]): string {
  const scripts = urls.map(u => `<script src="${u}"></script>`).join('\n')
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${scripts}</body></html>`
}

function startServer(): Promise<{ port: number, close: () => void }> {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const key = req.url?.slice(1) || ''
      const meta = scriptMeta[key]
      if (!meta || meta.urls.length === 0) {
        res.writeHead(404)
        res.end('Not found')
        return
      }
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end(buildHtml(meta.urls))
    })
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address()
      const port = typeof addr === 'object' && addr ? addr.port : 0
      resolve({ port, close: () => server.close() })
    })
  })
}

async function main() {
  const { port, close } = await startServer()
  console.log(`Server listening on http://127.0.0.1:${port}`)

  const browser = await chromium.launch({ headless: true })
  const sizes: Record<string, ScriptSizeEntry> = {}

  for (const [key, meta] of Object.entries(scriptMeta)) {
    if (meta.urls.length === 0) {
      console.log(`${key}: no URLs, skipping`)
      sizes[key] = { totalTransferKb: 0, totalDecodedKb: 0, loadTimeMs: 0, scripts: [] }
      continue
    }

    console.log(`${key}: measuring ${meta.urls.length} URL(s)...`)
    const page = await browser.newPage()

    // Collect CDP response data for CORS-blocked transferSize/decodedSize fallback
    const cdpData = new Map<string, CdpResponseData>()
    const cdpSession = await page.context().newCDPSession(page)
    await cdpSession.send('Network.enable')

    const requestIdToUrl = new Map<string, string>()

    cdpSession.on('Network.requestWillBeSent', (event) => {
      requestIdToUrl.set(event.requestId, event.request.url)
    })

    cdpSession.on('Network.responseReceived', (event) => {
      const url = event.response.url
      if (url.startsWith('http://127.0.0.1'))
        return
      const headers = event.response.headers
      const encoding = headers['content-encoding'] || headers['Content-Encoding'] || 'none'
      cdpData.set(url, {
        transferSize: 0,
        decodedSize: 0,
        encoding,
      })
    })

    cdpSession.on('Network.loadingFinished', (event) => {
      const url = requestIdToUrl.get(event.requestId)
      if (!url || !cdpData.has(url))
        return
      const entry = cdpData.get(url)!
      if (event.encodedDataLength > 0)
        entry.transferSize = event.encodedDataLength
      // Fetch decoded body size via CDP
      cdpSession.send('Network.getResponseBody', { requestId: event.requestId })
        .then(({ body, base64Encoded }) => {
          entry.decodedSize = base64Encoded
            ? Math.ceil(body.length * 3 / 4) // base64 → byte estimate
            : Buffer.byteLength(body, 'utf8')
        })
        .catch(() => {}) // Some responses may be unavailable
    })

    await page.goto(`http://127.0.0.1:${port}/${key}`, { waitUntil: 'networkidle', timeout: 30_000 })
      .catch((err) => {
        console.warn(`  [timeout] ${key}: ${err.message}`)
      })

    // Wait for async CDP getResponseBody calls to settle
    await new Promise(r => setTimeout(r, 200))

    // Collect Performance API entries
    const perfEntries = await page.evaluate(() => {
      return performance.getEntriesByType('resource').map((e) => {
        const r = e as PerformanceResourceTiming
        return {
          name: r.name,
          transferSize: r.transferSize,
          decodedBodySize: r.decodedBodySize,
          duration: r.duration,
          initiatorType: r.initiatorType,
          nextHopProtocol: r.nextHopProtocol,
        }
      })
    })

    const scripts: ScriptSizeDetail[] = []
    let maxDuration = 0

    for (const entry of perfEntries) {
      // Skip localhost resources
      if (entry.name.startsWith('http://127.0.0.1'))
        continue

      const cdpEntry = cdpData.get(entry.name)

      // Prefer Performance API, fall back to CDP for CORS-blocked entries
      const transferBytes = entry.transferSize > 0 ? entry.transferSize : (cdpEntry?.transferSize ?? 0)
      const decodedBytes = entry.decodedBodySize > 0 ? entry.decodedBodySize : (cdpEntry?.decodedSize ?? transferBytes)
      const encoding = cdpEntry?.encoding ?? 'none'

      if (transferBytes === 0 && decodedBytes === 0)
        continue

      const detail: ScriptSizeDetail = {
        url: entry.name,
        transferKb: round(transferBytes),
        decodedKb: round(decodedBytes),
        encoding,
        durationMs: Math.round(entry.duration),
        initiatorType: entry.initiatorType,
        protocol: entry.nextHopProtocol || 'unknown',
      }

      scripts.push(detail)
      if (entry.duration > maxDuration)
        maxDuration = entry.duration

      console.log(`  ${detail.url} → ${detail.transferKb}KB transfer, ${detail.decodedKb}KB decoded, ${encoding}, ${detail.durationMs}ms`)
    }

    let totalTransfer = 0
    let totalDecoded = 0
    for (const s of scripts) {
      totalTransfer += s.transferKb
      totalDecoded += s.decodedKb
    }

    sizes[key] = {
      totalTransferKb: Number.parseFloat(totalTransfer.toFixed(1)),
      totalDecodedKb: Number.parseFloat(totalDecoded.toFixed(1)),
      loadTimeMs: Math.round(maxDuration),
      scripts,
    }

    await page.close()

    // Small delay between providers to avoid rate limiting
    await new Promise(r => setTimeout(r, 500))
  }

  await browser.close()
  close()

  const outPath = resolve(import.meta.dirname, '../src/script-sizes.json')
  writeFileSync(outPath, `${JSON.stringify(sizes, null, 2)}\n`)
  console.log(`\nWrote ${outPath}`)
}

main()
