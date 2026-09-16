import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('paypal docs minimum version consistency', () => {
  it('docs state the same minimum major as the peer dependency range', () => {
    const pkg = JSON.parse(readFileSync(resolve(__dirname, '../../packages/script/package.json'), 'utf-8'))
    const peerRange: string = pkg.peerDependencies['@paypal/paypal-js']
    const major = Number(peerRange.match(/\^(\d+)\./)![1])

    const docs = readFileSync(resolve(__dirname, '../../docs/content/scripts/paypal.md'), 'utf-8')
    const claim = docs.match(/Nuxt Scripts requires `@paypal\/paypal-js` v(\d+) or later/)!

    expect(claim, 'docs must state the minimum @paypal/paypal-js version').toBeTruthy()
    expect(Number(claim[1]), `peer dependency requires ^${major}.0.0 but docs state v${claim[1]}`).toBe(major)
  })
})
