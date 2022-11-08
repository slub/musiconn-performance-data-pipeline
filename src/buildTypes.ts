import {INDICES} from "./context";
import {quicktypeFromFile} from "./helper/quicktypeIO";

const buildTypes = async () => INDICES.map(async (typeName: string) =>
    await quicktypeFromFile('typescript', typeName, {outputFile: `./src/types/${typeName}.ts`}));

buildTypes();
