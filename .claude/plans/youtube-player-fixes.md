# YouTube Player Fixes

Combined plan for #339, #297, #561

## Issues

### #339 - ScriptYouTubePlayer loads ALL iframes on click
- **Repro**: https://stackblitz.com/edit/nuxt-starter-kq6qv7el
- **Problem**: Multiple YouTube players on page, clicking one loads ALL iframes
- **Cause**: Event delegation bug - likely shared state or wrong element targeting
- **Fix**: Isolate click handler per instance

### #297 - YouTube bug with layouts + transitions + useFetch
- **Repro**: https://stackblitz.com/edit/nuxt-starter-aqvq3n
- **Problem**: Navigate between layouts, video on last page won't play after script loads
- **Cause**: Async state + layout transitions + useFetch timing issue
- **Fix**: Likely needs to handle component unmount/remount during transitions
- **Note**: Works if wrapped in `<ClientOnly>`

### #561 - YouTube thumbnail objectFit changed to contain
- **Problem**: objectFit was changed from `cover` to `contain`, breaks non-16:9 videos (e.g. 9:16 shorts)
- **Cause**: Commit aab8428e changed the default
- **Fix**: Revert to `cover` or make it configurable

## Files to Investigate

- `src/runtime/components/ScriptYouTubePlayer.vue`
- Related composables for YouTube

## Plan

1. [ ] Read ScriptYouTubePlayer.vue component
2. [ ] Analyze #339 - find shared state causing all iframes to load
3. [ ] Analyze #297 - understand lifecycle during transitions
4. [ ] Analyze #561 - check objectFit styling, consider making it a prop
5. [ ] Write fixes
6. [ ] Test with reproductions
