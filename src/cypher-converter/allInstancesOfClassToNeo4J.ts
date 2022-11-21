import df from "@rdfjs/data-model";
import {DatasetCore, Quad} from "@rdfjs/types";
import {rdf} from "@tpluscode/rdf-ns-builders";
import {ProgressBar} from "ascii-progress";
import {Prefixes} from "n3";
import {QueryResult, Session} from "neo4j-driver";

import {iriToPrefixed} from "../helper/iri";
import {rdfNodeToCypherStatement} from "./buildCypherStatements";

/**
 * iterate through all entities of a class and convert all literal properties to a
 * cypher statement that creates a node with all properties
 */
export async function allInstancesOfClassToNeo4j(classIRI: string, prefixes: Prefixes<string>, dataset: DatasetCore<Quad>, session: Session, shouldTestExistence = false) {
    console.log(`size of dataset: ${dataset.size}`)
    const subjects = Array.from(dataset.match(null, rdf.type, df.namedNode(classIRI))).map(({subject}) => subject)
    const bar = new ProgressBar({
        schema: '[:bar.green] :percent :current/:total :etas :token1',
        total: subjects.length,
    })
    let subjectIndex = 0
    for (const subject of subjects) {
        //test if subject is already a node within neo4j
        let result: QueryResult | undefined
        if (shouldTestExistence) {
            result = await session.run(`MATCH (n) WHERE n.id = $iri RETURN n`, {iri: subject.value})
        }
        if ((shouldTestExistence && result?.records.length !== 0) || subject.termType !== 'NamedNode') {
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
