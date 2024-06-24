import { addComponent, addTemplate, useNuxt } from "@nuxt/kit";
import { GoogleYoutubeEmbedData, type Data } from "third-party-capital";
import { getTpcEmbedComponent } from "./utils";

export default function youtubeEmbedRegistry() {
    const nuxt = useNuxt()

    const { dst } = addTemplate({
        getContents() {
            return getTpcEmbedComponent(GoogleYoutubeEmbedData as Data)
        },
        filename: 'nuxt-scripts/tpc/youtube-embed.ts',
        write:true
    })

    addComponent({
        export: 'default',
        filePath: dst,
        name: 'YoutubeEmbed'
    })
} 