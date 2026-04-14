import { describe, expect, it } from 'vitest'
import { LOGOS } from '../../packages/script/src/registry-logos'

describe('registry logos', () => {
  it('googleRecaptcha uses same logo as googleSignIn', () => {
    expect(LOGOS.googleRecaptcha).toBe(LOGOS.googleSignIn)
  })

  it('all logos are non-empty strings or light/dark objects', () => {
    for (const [key, logo] of Object.entries(LOGOS)) {
      if (typeof logo === 'string') {
        expect(logo, `${key} logo should be non-empty`).toBeTruthy()
        expect(logo, `${key} logo should be SVG or image URL`).toMatch(/^<svg|^https?:\/\//)
      }
      else {
        expect(logo.light, `${key} light logo should be non-empty`).toBeTruthy()
        expect(logo.dark, `${key} dark logo should be non-empty`).toBeTruthy()
      }
    }
  })
})
