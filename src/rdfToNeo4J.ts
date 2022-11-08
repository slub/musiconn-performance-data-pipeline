import * as cli from "@asgerf/strongcli";
import {TypeType} from "./helper/basic";
import * as fs from "fs";
import N3, {Prefixes} from "n3";
import {classIRI, entityIRI, makeClassNode, propsIRI} from "./rdf-converter/vocabulary";
import datasetFactory from "@rdfjs/dataset";
import neo4j from "neo4j-driver";
import {allInstancesOfClassToNeo4j} from "./cypher-converter/allInstancesOfClassToNeo4J";

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

    await allInstancesOfClassToNeo4j(classIri.value, prefixes_string_only, dataset, session, false)
    await session.close()
    await driver.close()
}

run()

