import * as fs from "fs";
import quicktypeJSON from "./helper/quicktype";

export async function buildTypes() {

    const INDICES = ["date","subject","work","corporation","source","series","person","authority","location","event"]

    INDICES.map( async (typeName: string) => {
        const jsonString = fs.readFileSync(`${typeName}_data_pretty.json`)

        const { lines } = await quicktypeJSON(
            "typescript", typeName,
            jsonString.toString()
        );
        fs.writeFileSync(`./src/types/${typeName}.ts`, lines.join('\n'))

    })

}

buildTypes();
