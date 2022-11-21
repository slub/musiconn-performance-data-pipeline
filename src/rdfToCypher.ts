import * as cli from "@asgerf/strongcli";
import df from "@rdfjs/data-model";
import datasetFactory from "@rdfjs/dataset";
import {DatasetCore, Quad} from "@rdfjs/types";
import {rdf} from "@tpluscode/rdf-ns-builders";
import * as fs from "fs";
import N3, {Prefixes} from "n3";

import {
    rdfNodeToCypherStatement
} from "./cypher-converter/buildCypherStatements";
import {TypeType} from "./helper/basic";
import {iriToPrefixed} from "./helper/iri";
import {makeClassNode, prefixes} from "./rdf-converter/vocabulary";

interface Options {
    outputDir: string
    inputFile: string
    type: TypeType
}

const {options} = cli.main<Options>({
    outputDir: {
        value: String,
        alias: '-o',
        default: cli.required
    },
    inputFile: {
        value: String,
        alias: '-i',
        default: cli.required
    },
    type: {
        value: x => x as TypeType,
        alias: '-t',
        default: cli.required
    }
})

const {outputDir, inputFile, type} = options

/**
 * iterate through all entities of a class and convert all literal proprties to a
 * cypher statement that creates a node with all properties
 */
export function allInstancesOfClassToCypherStatements(classIRI: string, prefixes: Prefixes<string>, dataset: DatasetCore<Quad>): string[] {
    const statements: string[] = []
    console.log(`size of dataset: ${dataset.size}`)
    const limit = 100
    let subjectIndex = 0
    for (const {subject} of Array.from(dataset.match(null, rdf.type, df.namedNode(classIRI))))  //.forEach(({subject}, subjectIndex) => )
    {
        if (subject.termType !== 'NamedNode') continue
        if (subjectIndex >= limit) break

        const neo4jType = iriToPrefixed(classIRI, prefixes)?.[1] ?? classIRI
        const tempNodeVariable = `node_${subjectIndex}`
        statements.push(...rdfNodeToCypherStatement(tempNodeVariable, neo4jType, subject, prefixes, dataset))
        subjectIndex++
    }

    return statements
}

const run = () => {
    //read turtle file and parse it
    const turtle = fs.readFileSync(inputFile, 'utf8'),
        rdfStream = (new N3.Parser()).parse(turtle),
        dataset = datasetFactory.dataset(rdfStream)


    const classIri = makeClassNode(type),
        prefixes_string_only: Prefixes<string> = Object.fromEntries(Object.entries(prefixes)
            .map(([prefix, iri]) => [prefix, typeof iri === 'string' ? iri : iri.value])),
        cypherStatements = allInstancesOfClassToCypherStatements(classIri.value, prefixes_string_only, dataset),
        outFileName = `${outputDir}/${type}.cypher`
    fs.writeFileSync(outFileName, cypherStatements.join('\n'))
}

run()

