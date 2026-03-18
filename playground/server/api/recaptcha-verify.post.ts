export default defineEventHandler(async (event) => {
  const { token } = await readBody(event)

  // Google's test secret key (always passes verification)
  // https://developers.google.com/recaptcha/docs/faq#id-like-to-run-automated-tests-with-recaptcha.-what-should-i-do
  const secretKey = '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe'

  const response = await $fetch<{
    'success': boolean
    'score'?: number
    'action'?: string
    'challenge_ts'?: string
    'hostname'?: string
    'error-codes'?: string[]
  }>('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret: secretKey, response: token }).toString(),
  })

  return {
    success: response.success,
    score: response.score,
    action: response.action,
    errors: response['error-codes'],
  }
})
