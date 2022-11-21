import fs from "fs";
import {
Options,
    TargetLanguage} from "quicktype-core";

import quicktypeJSON from "./quicktype";

export async function quicktypeFromFile(targetLanguage: string | TargetLanguage, typeName: string, options: Partial<Options & {fileExtension: string, inputFile: string, outputFile: string}> = {}) {
    const {
        fileExtension = 'js',
        inputFile = `data/${typeName}_data_pretty.json`,
        outputFile = `./data/${targetLanguage}/${typeName}.${fileExtension}` } = options;
    const jsonString = fs.readFileSync(inputFile)
    const { lines } = await quicktypeJSON(
        targetLanguage, typeName,
        jsonString.toString(),
        options
    );
    fs.writeFileSync(outputFile, lines.join('\n'))
}

