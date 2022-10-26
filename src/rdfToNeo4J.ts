import * as cli from "@asgerf/strongcli";
import {TypeType} from "./helper/basic";
import * as fs from "fs";
import N3, {Prefixes} from "n3";
import {classIRI, entityIRI, makeClassNode, prefixes, propsIRI} from "./rdf-converter/vocabulary";
import {
    rdfNodeToCypherStatement
} from "./cypher-converter/buildCypherStatements";
import datasetFactory from "@rdfjs/dataset";
import {iriToPrefixed} from "./helper/iri";
import {rdf} from "@tpluscode/rdf-ns-builders";
import df from "@rdfjs/data-model";
import {DatasetCore, Quad} from "@rdfjs/types";
import neo4j, {Session} from "neo4j-driver";
import {ProgressBar} from "ascii-progress";

interface Options {
    database: string
    inputFile: string
    type: TypeType
}

const {options, args} = cli.main<Options>({
    database: {
        value: String,
        alias: '-d',
        default: "bolt://localhost:7687"
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

const {database, inputFile, type} = options

/**
 * iterate through all entities of a class and convert all literal proprties to a
 * cypher statement that creates a node with all properties
 */
export async function allInstancesOfClassToNeo4j(classIRI: string, prefixes: Prefixes<string>, dataset: DatasetCore<Quad>, session: Session) {
    console.log(`size of dataset: ${dataset.size}`)
    const subjects = Array.from(dataset.match(null, rdf.type, df.namedNode(classIRI))).map(({subject}) => subject)
    const bar = new ProgressBar({
        schema: '[:bar.green] :percent :current/:total :etas :token1',
        total: subjects.length,
    })
    let subjectIndex = 0
    for (const subject of subjects) {
        //test if subject is already a node within neo4j
        const result = await session.run(`MATCH (n) WHERE n.id = $iri RETURN n`, {iri: subject.value})
        if (result.records.length !== 0 || subject.termType !== 'NamedNode') {
            bar.tick(1, {token1: `skipped ${subject.value}`})
        } else {
            const neo4jType = iriToPrefixed(classIRI, prefixes)?.[1] ?? classIRI,
                tempNodeVariable = `node_${subjectIndex}`,
                statements = rdfNodeToCypherStatement(tempNodeVariable, neo4jType, subject, prefixes, dataset)
            try {
                await session.run(statements.join('\n'))
            } catch (e) {
                console.error(`cannot import ${subject.value} because of ${e}`)
            }
            bar.tick(1, {token1: subject.value})
        }
        subjectIndex++
    }

}

const run = async () => {
    //read turtle file and parse it
    const turtle = fs.readFileSync(inputFile, 'utf8'),
        rdfStream = (new N3.Parser()).parse(turtle),
        dataset = datasetFactory.dataset(rdfStream),
        driver = neo4j.driver(database),
        session = driver.session()


    const classIri = makeClassNode(type),
        prefixes_string_only: Prefixes<string> = {
            mpp: propsIRI,
            mpe: entityIRI,
            mpc: classIRI
        }

    await allInstancesOfClassToNeo4j(classIri.value, prefixes_string_only, dataset, session)
    await session.close()
    await driver.close()
}

run()

