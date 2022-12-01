import {INDICES} from "./context";
import {quicktypeFromFile} from "./helper/quicktypeIO";

const buildJsonSchema = async () => INDICES.map(async (typeName: string) =>
    await quicktypeFromFile('schema', typeName, {
        fileExtension: 'json',
        postProcess: (generated, outFilename) => {
            const json = JSON.parse(generated);
            json.$id = `./${outFilename}`;
            return JSON.stringify(json, null, 2);
        }}));

buildJsonSchema();
