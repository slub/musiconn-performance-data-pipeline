import {
    InputData,
    jsonInputForTargetLanguage,
Options,
    quicktype, TargetLanguage} from "quicktype-core";

async function quicktypeJSON(targetLanguage: string | TargetLanguage, typeName: string, jsonString: string, options: Partial<Options> = {}) {
    const jsonInput = jsonInputForTargetLanguage(targetLanguage);

    // We could add multiple samples for the same desired
    // type, or many sources for other types. Here we're
    // just making one type from one piece of sample JSON.
    await jsonInput.addSource({
        name: typeName,
        samples: [jsonString],
    });

    const inputData = new InputData();
    inputData.addInput(jsonInput);

    return await quicktype({
        inputData,
        lang: targetLanguage,
        ...options
    });
}


export default quicktypeJSON