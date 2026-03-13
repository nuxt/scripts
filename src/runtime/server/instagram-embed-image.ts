import { createImageProxyHandler } from './utils/image-proxy'

export default createImageProxyHandler({
  allowedDomains: hostname =>
    hostname.endsWith('.cdninstagram.com') || hostname === 'scontent.cdninstagram.com',
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  followRedirects: false,
  decodeAmpersands: true,
})
