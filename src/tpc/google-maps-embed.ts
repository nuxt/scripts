import { useNuxt, addTemplate, addComponent } from "@nuxt/kit"
import { GoogleMapsEmbedData, type Data } from "third-party-capital"
import { getTpcEmbedComponent } from "./utils"


export default function GoogleMapsEmbedRegistry() {
    const nuxt = useNuxt()

    const { dst } = addTemplate({
        getContents() {
            return getTpcEmbedComponent(GoogleMapsEmbedData as Data)
        },
        filename: 'nuxt-scripts/tpc/google-maps-embed.ts',
        write:true
    })

    addComponent({
        export: 'default',
        filePath: dst,
        name: 'GoogleMaps'
    })
} 