import {INDICES} from "./context";
import {quicktypeFromFile} from "./helper/quicktypeIO";

const buildJsonSchema = async () => INDICES.map(async (typeName: string) =>
    await quicktypeFromFile('schema', typeName, {fileExtension: 'json'}));

buildJsonSchema();
