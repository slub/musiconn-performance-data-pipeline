import fs from "fs";
import {
    Options,
    TargetLanguage
} from "quicktype-core";

import quicktypeJSON from "./quicktype";

export async function quicktypeFromFile(targetLanguage: string | TargetLanguage, typeName: string, options: Partial<Options & {outFilename?: string, fileExtension: string, inputFile: string, outputFile: string, postProcess?: (generated: string, outFilename: string) => string}> = {}) {
    const {
        fileExtension = 'js',
        inputFile = `data/${typeName}_data_pretty.json`,
        outFilename = `${typeName}.${fileExtension}`,
        outputFile = `./data/${targetLanguage}/${outFilename}`,
        postProcess
    } = options;
    const jsonString = fs.readFileSync(inputFile)
    const { lines } = await quicktypeJSON(
        targetLanguage, typeName,
        jsonString.toString(),
        options
    );
    const generated = lines.join("\n");
    fs.writeFileSync(outputFile, postProcess ? postProcess(generated, outFilename) : generated);
}

