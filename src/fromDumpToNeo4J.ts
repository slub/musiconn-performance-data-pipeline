import * as fs from "fs";
import ndjson from "ndjson";
import {EntityToRDFTransform} from "./stream/EntityToRDFTransform";
import {Person} from "./types/person";
import {personToRDF} from "./rdf-converter/person";
import {eventToRDF} from "./rdf-converter/event";
import {Location} from "./types/location";
import {locationToRDF} from "./rdf-converter/location";
import {Work} from "./types/work";
import {workToRDF} from "./rdf-converter/work";
import {Corporation} from "./types/corporation";
import {corporationToRDF} from "./rdf-converter/corporation";
import {Subject} from "./types/subject";
import {subjectToRDF} from "./rdf-converter/subject";
import {seriesToRDF} from "./rdf-converter/series";
import {Series} from "./types/series";
import {Source} from "./types/source";
import {Event} from "./types/event";
import {sourceToRDF} from "./rdf-converter/source";
import {Neo4JCypherStreamWriter} from "./stream/Neo4JCypherStreamWriter";
import neo4j from "neo4j-driver";
import {Prefixes} from "n3";
import {classIRI, entityIRI, propsIRI} from "./rdf-converter/vocabulary";
import {RdfSubject2CypherTransformer} from "./stream/RdfSubject2CypherTransformer";
import {ObservableOptions, ObservableStatus} from "./helper/types";
import {ProgressBar} from "ascii-progress";
import {countFileLines} from "./helper/countFileLines";

const typeSaveTransforms = {
    "person": (opts: Partial<ObservableOptions> = {}) => new EntityToRDFTransform<Person>(personToRDF, {index: "personToRDF", ...opts}),
    "event": (opts: Partial<ObservableOptions> = {}) => new EntityToRDFTransform<Event>(eventToRDF, {index: "eventToRDF", ...opts}),
    "location": (opts: Partial<ObservableOptions> = {}) => new EntityToRDFTransform<Location>(locationToRDF, {index: "locationToRDF", ...opts}),
    "work": (opts: Partial<ObservableOptions> = {}) => new EntityToRDFTransform<Work>(workToRDF, {index: "workToRDF", ...opts}),
    "corporation": (opts: Partial<ObservableOptions> = {}) => new EntityToRDFTransform<Corporation>(corporationToRDF, {index: "corporationToRDF", ...opts}),
    "subject": (opts: Partial<ObservableOptions> = {}) => new EntityToRDFTransform<Subject>(subjectToRDF, {index: "subjectToRDF", ...opts}),
    "series": (opts: Partial<ObservableOptions> = {}) => new EntityToRDFTransform<Series>(seriesToRDF, {index: "seriesToRDF", ...opts}),
    "source": (opts: Partial<ObservableOptions> = {}) => new EntityToRDFTransform<Source>(sourceToRDF, {index: "sourceToRDF", ...opts}),
}
type TypeType = keyof typeof typeSaveTransforms;


const dumpDir = './data',
    database = "bolt://localhost:7687"

export async function fromDumpToNeo4J(log: (observerStatus: ObservableStatus) => void, type: TypeType) {
    const prefixes_string_only: Prefixes<string> = {
            mpp: propsIRI,
            mpe: entityIRI,
            mpc: classIRI
        },
        driver = neo4j.driver(database),
        session = driver.session(),
        rdfizer = typeSaveTransforms[type]({log}),
        cypherer = new RdfSubject2CypherTransformer(prefixes_string_only),
        neo4jWriter = new Neo4JCypherStreamWriter(session)


    const ndjsonReadStream = fs.createReadStream(`${dumpDir}/${type}_data.json`)
        .pipe(ndjson.parse())
        .pipe(rdfizer)
        .pipe(cypherer)
        .pipe(neo4jWriter)

    return new Promise((resolve, reject) => {
        ndjsonReadStream.on('error', reject)
        ndjsonReadStream.on('finish', resolve)
    })

}

const main = async () => {
    for (let _type of ['location', 'person', 'event', 'work', 'corporation', 'subject', 'series', 'source'] as TypeType[]) {
        const lineCount = await countFileLines(`${dumpDir}/${_type}_data.json`);
        console.log(`Starting ${_type} with ${lineCount} lines`)
        const bar = new ProgressBar({
            schema: '[:bar.green] :percent :current/:total :etas :token1',
            total: lineCount
        })
        const log = (observerStatus: ObservableStatus) => {
            bar.tick(1, {token1: observerStatus.message})
        }
        await fromDumpToNeo4J(log, _type as TypeType)
    }
}
main()
