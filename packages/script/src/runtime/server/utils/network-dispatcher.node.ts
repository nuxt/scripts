import type { IncomingMessage, RequestOptions } from 'node:http'
import type { CreateNetworkDispatcher, NetworkAddress } from './network-host'
import { lookup } from 'node:dns'
import { Agent as HttpAgent, request as httpRequest } from 'node:http'
import { Agent as HttpsAgent, request as httpsRequest } from 'node:https'
import { Readable } from 'node:stream'
import { createBrotliDecompress, createGunzip, createInflate, constants as zlibConstants } from 'node:zlib'

/**
 * Node has no public API for a custom DNS lookup on `globalThis.fetch`, and the proxy
 * needs one: the address is validated inside the socket connection, so a rebind between
 * the check and the connect cannot slip past. So this is a fetch built on `node:http`,
 * which does accept a lookup, rather than a fetch with an undici `Agent` bolted on.
 * Keeping undici out saves roughly 1.6 MB from a traced Node server build.
 */

/** Statuses that must carry a null body, per fetch. */
const NULL_BODY_STATUS = new Set([101, 103, 204, 205, 304])

const ACCEPTED_ENCODINGS = 'gzip, deflate, br'

function toHeaderRecord(headers: HeadersInit | undefined): Record<string, string | string[]> {
  const record: Record<string, string | string[]> = {}
  if (!headers)
    return record
  const append = (name: string, value: string) => {
    const key = name.toLowerCase()
    const existing = record[key]
    if (existing === undefined)
      record[key] = value
    else if (Array.isArray(existing))
      existing.push(value)
    else
      record[key] = [existing, value]
  }
  if (headers instanceof Headers) {
    headers.forEach((value, name) => append(name, value))
  }
  else if (Array.isArray(headers)) {
    for (const [name, value] of headers) append(name, value)
  }
  else {
    for (const [name, value] of Object.entries(headers)) append(name, String(value))
  }
  return record
}

/** Node exposes duplicate response headers only through `rawHeaders`, and `set-cookie` needs them. */
function toResponseHeaders(raw: string[]): Headers {
  const headers = new Headers()
  for (let i = 0; i < raw.length; i += 2)
    headers.append(raw[i]!, raw[i + 1]!)
  return headers
}

/**
 * Decode the body the way fetch does, so callers see plain bytes and can keep treating
 * `content-encoding` as a header to strip rather than a body format to handle.
 */
function decodeBody(response: IncomingMessage): Readable {
  const encodings = String(response.headers['content-encoding'] || '')
    .split(',')
    .map(encoding => encoding.trim().toLowerCase())
    .filter(Boolean)
    .reverse()

  // Tolerate an upstream that ends the stream without a proper trailer, the way fetch does.
  const flush = { finishFlush: zlibConstants.Z_SYNC_FLUSH }
  let stream: Readable = response
  for (const encoding of encodings) {
    if (encoding === 'gzip' || encoding === 'x-gzip')
      stream = stream.pipe(createGunzip(flush))
    else if (encoding === 'deflate' || encoding === 'x-deflate')
      stream = stream.pipe(createInflate(flush))
    else if (encoding === 'br')
      stream = stream.pipe(createBrotliDecompress())
    else
      break // identity, or an encoding we do not decode; hand the bytes through untouched
  }
  return stream
}

/** Byte length of a body fetch would send with a `content-length`, or null when it streams. */
function knownBodyLength(body: BodyInit | null | undefined): number | null {
  if (body === undefined || body === null)
    return null
  if (typeof body === 'string')
    return Buffer.byteLength(body)
  if (body instanceof URLSearchParams)
    return Buffer.byteLength(body.toString())
  if (ArrayBuffer.isView(body))
    return body.byteLength
  if (body instanceof ArrayBuffer)
    return body.byteLength
  return null
}

function writeRequestBody(request: ReturnType<typeof httpRequest>, body: BodyInit | null | undefined): void {
  if (body === undefined || body === null) {
    request.end()
    return
  }
  if (typeof body === 'string') {
    request.end(body)
    return
  }
  if (body instanceof ReadableStream) {
    Readable.fromWeb(body as Parameters<typeof Readable.fromWeb>[0]).pipe(request)
    return
  }
  if (body instanceof URLSearchParams) {
    request.end(body.toString())
    return
  }
  if (ArrayBuffer.isView(body)) {
    request.end(Buffer.from(body.buffer, body.byteOffset, body.byteLength))
    return
  }
  if (body instanceof ArrayBuffer) {
    request.end(Buffer.from(body))
    return
  }
  request.destroy(new TypeError(`Unsupported proxy request body of type ${Object.prototype.toString.call(body)}`))
}

function requestThroughAgent(
  url: URL,
  init: RequestInit,
  agents: { http: HttpAgent, https: HttpsAgent },
): Promise<Response> {
  const isSecure = url.protocol === 'https:'
  const headers = toHeaderRecord(init.headers)
  if (!('accept-encoding' in headers))
    headers['accept-encoding'] = ACCEPTED_ENCODINGS

  const method = (init.method || 'GET').toUpperCase()
  if (headers['content-length'] === undefined) {
    const length = knownBodyLength(init.body)
    if (length !== null)
      headers['content-length'] = String(length)
  }

  const options: RequestOptions = {
    method,
    headers,
    agent: isSecure ? agents.https : agents.http,
    signal: init.signal ?? undefined,
  }

  return new Promise<Response>((resolve, reject) => {
    const request = (isSecure ? httpsRequest : httpRequest)(url, options, (response) => {
      const status = response.statusCode ?? 502
      const body = NULL_BODY_STATUS.has(status) || method === 'HEAD'
        ? null
        : Readable.toWeb(decodeBody(response)) as ReadableStream<Uint8Array>
      resolve(new Response(body, {
        status,
        statusText: response.statusMessage || '',
        headers: toResponseHeaders(response.rawHeaders),
      }))
    })
    request.on('error', reject)
    writeRequestBody(request, init.body)
  })
}

export const createNetworkDispatcher: CreateNetworkDispatcher = async (createLookup, resolveHostnameOverride) => {
  const resolveHostname = resolveHostnameOverride || ((hostname, callback) => {
    lookup(hostname, { all: true, verbatim: true }, (error, addresses) => {
      callback(error, addresses as NetworkAddress[])
    })
  })
  const pinnedLookup = createLookup(resolveHostname)
  const agents = {
    http: new HttpAgent({ keepAlive: true, lookup: pinnedLookup }),
    https: new HttpsAgent({ keepAlive: true, lookup: pinnedLookup }),
  }
  return {
    fetch: ((input, init) => requestThroughAgent(
      new URL(input instanceof Request ? input.url : String(input)),
      init ?? {},
      agents,
    )) as typeof globalThis.fetch,
    close: async () => {
      agents.http.destroy()
      agents.https.destroy()
    },
  }
}
