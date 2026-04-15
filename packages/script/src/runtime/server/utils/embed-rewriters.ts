import { buildProxyUrl } from './proxy-url'

/**
 * Mutate a tweet (and any quoted tweet) in place so every raw CDN image URL
 * is rewritten to route through the site's `/embed/x-image` proxy. When a
 * `secret` is provided, URLs are HMAC-signed and pass `withSigning` without a
 * page token.
 *
 * Clone the input first if it came from a shared cache — this function does
 * not copy.
 */
export function rewriteTweetImages(
  tweet: any,
  imagePath: string,
  secret?: string,
): void {
  if (!tweet)
    return

  if (tweet.user?.profile_image_url_https)
    tweet.user.profile_image_url_https = buildProxyUrl(imagePath, { url: tweet.user.profile_image_url_https }, secret)

  if (tweet.photos) {
    for (const photo of tweet.photos) {
      if (photo.url)
        photo.url = buildProxyUrl(imagePath, { url: photo.url }, secret)
    }
  }

  if (tweet.entities?.media) {
    for (const media of tweet.entities.media) {
      if (media.media_url_https)
        media.media_url_https = buildProxyUrl(imagePath, { url: media.media_url_https }, secret)
    }
  }

  if (tweet.video?.poster)
    tweet.video.poster = buildProxyUrl(imagePath, { url: tweet.video.poster }, secret)

  if (tweet.quoted_tweet)
    rewriteTweetImages(tweet.quoted_tweet, imagePath, secret)
}

/**
 * Mutate a Bluesky post in place so every CDN image URL routes through the
 * site's `/embed/bluesky-image` proxy. Covers author avatar, embedded images
 * (thumb + fullsize), and external embed thumbnails.
 *
 * Clone the input first if it came from a shared cache — this function does
 * not copy.
 */
export function rewriteBlueskyPostImages(
  post: any,
  imagePath: string,
  secret?: string,
): void {
  if (!post)
    return

  const proxy = (url: string | undefined): string | undefined =>
    url ? buildProxyUrl(imagePath, { url }, secret) : url

  if (post.author?.avatar)
    post.author.avatar = proxy(post.author.avatar)

  const embed = post.embed
  if (embed?.images) {
    for (const image of embed.images) {
      if (image.thumb)
        image.thumb = proxy(image.thumb)
      if (image.fullsize)
        image.fullsize = proxy(image.fullsize)
    }
  }
  if (embed?.external?.thumb)
    embed.external.thumb = proxy(embed.external.thumb)
}
