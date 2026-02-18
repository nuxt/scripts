# GA/GTM Fixes

## Issues

### #490 - Multi-lang GTAG docs
- **Status**: DONE (commit e961e71)
- **Action**: Close issue

### #540 - GTM SSR Error
- **Status**: Needs reproduction
- **Error**: `useScriptGoogleTagManager(...) is not a function`
- **Info**: Reported on Nuxt 4.1.3, no repro provided
- MarkerClusterer error in comments is unrelated (Google Maps issue)

## Tasks

- [x] Identify GA/GTM issues
- [x] Close #490
- [x] Request reproduction for #540

## Status: DONE

Both GA/GTM issues resolved:
- #490 closed (docs already exist)
- #540 awaiting reproduction from reporter

## Notes

Server-side GA4 proxy (#238) handled separately.
