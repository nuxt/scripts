import { createImageProxyHandler } from './utils/image-proxy'

export default createImageProxyHandler({
  allowedDomains: ['static.cdninstagram.com'],
  accept: '*/*',
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  cacheMaxAge: 86400,
  contentType: 'application/octet-stream',
  decodeAmpersands: true,
})
