import * as fs from "fs";
import quicktypeJSON from "./helper/quicktype";

export async function buildJsonSchemas() {
    
    const INDICES = ["date","subject","work","corporation","source","series","person","authority","location","event"]

    INDICES.map( async (typeName: string) => {
        const jsonString = fs.readFileSync(`${typeName}_data_pretty.json`)

        const { lines } = await quicktypeJSON(
            "schema", typeName,
            jsonString.toString()
        );
        fs.writeFileSync(`./schema/${typeName}_schema.json`, lines.join('\n'))

    })

}



buildJsonSchemas();
