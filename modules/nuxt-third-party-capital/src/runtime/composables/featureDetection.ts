import { onMounted } from 'vue'

/**
 * useFeatureDetection
 * Feature detection with feature markers, which is designed to be performance-neutral.
 * Javascript-based feature markers have been standardized in the W3C group around the User Timing API: https://www.w3.org/TR/user-timing/#dfn-mark_feature_usage
 *
 * @param id string - Name of feature to append.
 */
export function useFeatureDetection(id: string) {
  onMounted(() => {
    performance?.mark?.('mark_feature_usage', {
      detail: {
        feature: `nuxt-third-parties-${id}`,
      },
    })
  })
}
