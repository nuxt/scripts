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

export function msToHumanReadable(ms: number) {
  if (ms < 1000) {
    return `${ms}ms`
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(2)}s`
  }
  return `${(ms / 60000).toFixed(2)}m`
}

export function bytesToHumanReadable(bytes: number) {
  if (bytes === 0)
    return '0 B'
  if (bytes < 1024)
    return `${bytes} B`
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
