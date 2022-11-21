import {DatasetCore} from "@rdfjs/types";
import {Prefixes} from "n3";
import neo4j, {Session} from "neo4j-driver";
import {Writable} from "stronger-typed-streams";

import {allInstancesOfClassToNeo4j} from "../cypher-converter/allInstancesOfClassToNeo4J";
import {iriToPrefixed} from "../helper/iri";

export class Neo4JCypherWriter extends Writable<DatasetCore> {
    private session: Session | undefined
    private neo4jType: string | undefined
    private classIRI: string | undefined
    private prefixes: Prefixes<string> = {}
    private shouldTestExistence = false

    constructor(classIRI: string, prefixes: Prefixes<string>, database: string, shouldTestExistence = false) {
        super({objectMode: true})
        const driver = neo4j.driver(database)
        this.session = driver.session()
        this.classIRI = classIRI
        this.neo4jType = iriToPrefixed(classIRI, prefixes)?.[1] ?? classIRI
        this.prefixes = prefixes
        this.shouldTestExistence = shouldTestExistence
    }

    _write(dataset: DatasetCore, encoding: BufferEncoding, callback: () => void) {
        process.nextTick(() => {
            //console.log(turtle`${dataset}`.toString())
            if(!this.session || !this.classIRI || !this.neo4jType) {
                return
            }
            allInstancesOfClassToNeo4j(this.classIRI, this.prefixes, dataset, this.session, this.shouldTestExistence)
                .then(() => callback())
        })
    }

}
