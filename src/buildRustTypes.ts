import * as fs from "fs";
import quicktypeJSON from "./helper/quicktype";

export async function buildRustTypes() {

    const INDICES = ["date", "subject", "work", "corporation", "source", "series", "person", "authority", "location", "event"]

    INDICES.map(async (typeName: string) => {
        const jsonString = fs.readFileSync(`./data/${typeName}_data_pretty.json`)

        const {lines} = await quicktypeJSON(
            "rust",
            typeName,
            jsonString.toString(), {
                rendererOptions: {
                    visibility: "public"
                }
            }
        );
        fs.writeFileSync(`./data/rust/${typeName}_schema.rs`, lines.join('\n'))

    })

}


buildRustTypes();
