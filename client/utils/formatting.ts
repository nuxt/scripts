import { isRelative } from 'ufo'

export function humanFriendlyTimestamp(timestamp: number) {
  // use Intl.DateTimeFormat to format the timestamp, we only need the time aspect
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: true,
  }).format(timestamp)
}

export function urlToOrigin(url: string) {
  if (isRelative(url, { acceptRelative: true }))
    return new URL(url).origin
  return url
}
