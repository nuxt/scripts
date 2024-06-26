import { onMounted } from "vue"

export function useFeatureDetection(id: string) {
    onMounted(() => {
        onMounted(() => {
            performance?.mark?.('mark_feature_usage', {
                detail: {
                    feature: `nuxt-third-parties-${id}`,
                }
            })
        })
    })
}