import {INDICES} from "./context";
import {quicktypeFromFile} from "./helper/quicktypeIO";

const buildRustTypes = async () => INDICES.map(async (typeName: string) =>
    await quicktypeFromFile('rust', typeName, {
        fileExtension: 'rs',
        rendererOptions: {
            visibility: "public"
        }
    }));

buildRustTypes();
