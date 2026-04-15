import { createError, defineEventHandler, getQuery, setHeader } from 'h3'
import { useRuntimeConfig } from 'nitropack/runtime'
import { createCachedJsonFetch } from './utils/cached-upstream'
import { rewriteBlueskyPostImages } from './utils/embed-rewriters'
import { withSigning } from './utils/withSigning'

interface PostThreadResponse {
  thread: {
    $type: string
    post: {
      uri: string
      cid: string
      author: Record<string, any>
      record: Record<string, any>
      embed?: Record<string, any>
      likeCount: number
      repostCount: number
      replyCount: number
      quoteCount: number
      indexedAt: string
      labels: Array<{ val: string }>
    }
  }
}

const BSKY_POST_URL_RE = /^https:\/\/bsky\.app\/profile\/([^/]+)\/post\/([^/?]+)$/
const EMBED_BSKY_SUFFIX_RE = /\/embed\/bluesky$/

// Handle → DID resolution is stable for the lifetime of the handle (renames
// are rare); cache for 24h so repeated embeds of the same author skip the
// lookup entirely.
const cachedProfileFetch = createCachedJsonFetch<{ did: string }>(
  'nuxt-scripts-bsky-profile',
  86400,
  url => url,
)

// Post threads are semi-fresh (like counts, reply counts change); 10min keeps
// numbers reasonably current while deduping repeat embeds.
const cachedPostFetch = createCachedJsonFetch<PostThreadResponse>(
  'nuxt-scripts-bsky-post',
  600,
  url => url,
)

export default withSigning(defineEventHandler(async (event) => {
  const query = getQuery(event)
  const postUrl = query.url as string

  if (!postUrl) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Post URL is required',
    })
  }

  const match = postUrl.match(BSKY_POST_URL_RE)
  if (!match) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid Bluesky post URL',
    })
  }

  const [, actor, rkey] = match as RegExpMatchArray

  // Resolve handle to DID if needed
  let did = actor!
  if (!actor!.startsWith('did:')) {
    const profile = await cachedProfileFetch(
      `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(actor!)}`,
    ).catch((error: any) => {
      throw createError({
        statusCode: error.statusCode || 500,
        statusMessage: 'Failed to resolve Bluesky handle',
      })
    })
    did = profile.did
  }

  const uri = `at://${did}/app.bsky.feed.post/${rkey}`

  const response = await cachedPostFetch(
    `https://public.api.bsky.app/xrpc/app.bsky.feed.getPostThread?uri=${encodeURIComponent(uri)}&depth=0&parentHeight=0`,
  ).catch((error: any) => {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch Bluesky post',
    })
  })

  if (response.thread.$type !== 'app.bsky.feed.defs#threadViewPost') {
    throw createError({
      statusCode: 404,
      statusMessage: 'Post not found',
    })
  }

  // Clone before mutating — cached response is shared across concurrent
  // requests under the memory driver.
  const post = structuredClone(response.thread.post) as Record<string, any>

  // Respect author opt-out
  const hasOptOut = post.labels?.some((l: { val: string }) => l.val === '!no-unauthenticated')
    || post.author?.labels?.some((l: { val: string }) => l.val === '!no-unauthenticated')
  if (hasOptOut) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Author has opted out of external embedding',
    })
  }

  // Rewrite CDN image URLs to proxied (HMAC-signed when a secret is set) URLs
  // so the client can render them without tripping the `withSigning` 403.
  const handlerPath = event.path?.split('?')[0] || ''
  const prefix = handlerPath.replace(EMBED_BSKY_SUFFIX_RE, '') || '/_scripts'
  const imagePath = `${prefix}/embed/bluesky-image`
  const secret = (useRuntimeConfig(event)['nuxt-scripts'] as { proxySecret?: string } | undefined)?.proxySecret
  rewriteBlueskyPostImages(post, imagePath, secret)

  // Cache for 10 minutes
  setHeader(event, 'Content-Type', 'application/json')
  setHeader(event, 'Cache-Control', 'public, max-age=600, s-maxage=600')

  return post
}))
