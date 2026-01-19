export default defineEventHandler(async (event) => {
  const { token } = await readBody(event)

  // Google's test secret key (always passes)
  const secretKey = '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe'

  const response = await $fetch<{
    'success': boolean
    'score'?: number
    'error-codes'?: string[]
  }>('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret: secretKey, response: token }).toString(),
  })

  return { success: response.success, score: response.score }
})
