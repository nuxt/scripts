import type { RegistryScriptInput } from '#nuxt-scripts/types'
import { BlueskyEmbedOptions } from './schemas'

export { BlueskyEmbedOptions }

export interface BlueskyEmbedPostData {
  uri: string
  cid: string
  author: {
    did: string
    handle: string
    displayName: string
    avatar: string
    labels: Array<{ val: string }>
    verification?: {
      verifiedStatus: string
    }
  }
  record: {
    $type: string
    createdAt: string
    text: string
    langs?: string[]
    facets?: Array<{
      features: Array<{
        $type: string
        uri?: string
        did?: string
        tag?: string
      }>
      index: {
        byteStart: number
        byteEnd: number
      }
    }>
    embed?: {
      $type: string
      images?: Array<{
        alt: string
        image: { ref: { $link: string }, mimeType: string, size: number }
        aspectRatio?: { width: number, height: number }
      }>
      external?: {
        uri: string
        title: string
        description: string
        thumb?: { ref: { $link: string }, mimeType: string, size: number }
      }
    }
  }
  embed?: {
    $type: string
    images?: Array<{
      thumb: string
      fullsize: string
      alt: string
      aspectRatio?: { width: number, height: number }
    }>
    external?: {
      uri: string
      title: string
      description: string
      thumb?: string
    }
  }
  likeCount: number
  repostCount: number
  replyCount: number
  quoteCount: number
  indexedAt: string
  labels: Array<{ val: string }>
}

export type BlueskyEmbedInput = RegistryScriptInput<typeof BlueskyEmbedOptions, false, false, false>

const BSKY_POST_URL_RE = /bsky\.app\/profile\/([^/]+)\/post\/([^/?]+)/

/**
 * Extract the handle/DID and post rkey from a Bluesky post URL
 */
export function extractBlueskyPostId(url: string): { actor: string, rkey: string } | undefined {
  const match = url.match(BSKY_POST_URL_RE)
  if (!match)
    return undefined
  return { actor: match[1]!, rkey: match[2]! }
}

/**
 * Proxy a Bluesky image URL through the server
 */
export function proxyBlueskyImageUrl(url: string, proxyEndpoint = '/_scripts/embed/bluesky-image'): string {
  const separator = proxyEndpoint.includes('?') ? '&' : '?'
  return `${proxyEndpoint}${separator}url=${encodeURIComponent(url)}`
}

/**
 * Format a Bluesky post date for display
 */
export function formatBlueskyDate(dateString: string): string {
  const date = new Date(dateString)
  const time = date.toLocaleString('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
    timeZone: 'UTC',
  })
  const month = date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })
  return `${time} · ${month} ${date.getUTCDate()}, ${date.getUTCFullYear()}`
}

/**
 * Format a number for display (e.g., 1234 -> 1.2K)
 */
export function formatCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`
  }
  return count.toString()
}

/**
 * Convert Bluesky facets (byte-range rich text annotations) to HTML
 */
export function facetsToHtml(text: string, facets?: BlueskyEmbedPostData['record']['facets']): string {
  if (!facets?.length)
    return escapeHtml(text)

  // Convert string to byte array for correct byte-offset slicing
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  const bytes = encoder.encode(text)

  // Sort facets by byte start position
  const sorted = facets.toSorted((a, b) => a.index.byteStart - b.index.byteStart)

  const parts: string[] = []
  let lastEnd = 0

  for (const facet of sorted) {
    // Add plain text before this facet
    if (facet.index.byteStart > lastEnd) {
      parts.push(escapeHtml(decoder.decode(bytes.slice(lastEnd, facet.index.byteStart))))
    }

    const facetText = escapeHtml(decoder.decode(bytes.slice(facet.index.byteStart, facet.index.byteEnd)))

    for (const feature of facet.features) {
      if (feature.$type === 'app.bsky.richtext.facet#link' && feature.uri) {
        parts.push(`<a href="${escapeHtml(feature.uri)}" target="_blank" rel="noopener noreferrer">${facetText}</a>`)
      }
      else if (feature.$type === 'app.bsky.richtext.facet#mention' && feature.did) {
        parts.push(`<a href="https://bsky.app/profile/${escapeHtml(feature.did)}" target="_blank" rel="noopener noreferrer">${facetText}</a>`)
      }
      else if (feature.$type === 'app.bsky.richtext.facet#tag' && feature.tag) {
        parts.push(`<a href="https://bsky.app/hashtag/${escapeHtml(feature.tag)}" target="_blank" rel="noopener noreferrer">${facetText}</a>`)
      }
      else {
        parts.push(facetText)
      }
    }

    lastEnd = facet.index.byteEnd
  }

  // Add remaining text
  if (lastEnd < bytes.length) {
    parts.push(escapeHtml(decoder.decode(bytes.slice(lastEnd))))
  }

  return parts.join('')
}

const AMP_RE = /&/g
const LT_RE = /</g
const GT_RE = />/g
const QUOT_RE = /"/g

function escapeHtml(str: string): string {
  return str
    .replace(AMP_RE, '&amp;')
    .replace(LT_RE, '&lt;')
    .replace(GT_RE, '&gt;')
    .replace(QUOT_RE, '&quot;')
}
