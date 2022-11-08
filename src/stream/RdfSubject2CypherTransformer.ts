import {DatasetCore, Quad} from "@rdfjs/types";
import {Transform} from "stronger-typed-streams";
import {Prefixes} from "n3";
import {TransformCallback} from "stream";
import df from "@rdfjs/data-model";
import {rdf} from "@tpluscode/rdf-ns-builders";
import {iriToPrefixed} from "../helper/iri";
import {rdfNodeToCypherStatement} from "../cypher-converter/buildCypherStatements";
import {PointedNode} from "../helper/types";


export class RdfSubject2CypherTransformer extends Transform<PointedNode, string> {
    constructor(private readonly prefixes: Prefixes<string>) {
        super({objectMode: true});
    }

    _transform(chunk: PointedNode, encoding: BufferEncoding, callback: TransformCallback) {
        process.nextTick(() => {
            const {subjectIRI, dataset} = chunk,
                classIRI = [...dataset.match(df.namedNode(subjectIRI), rdf.type, null)][0]?.object.value
            if (!classIRI) {
                console.error(`no class found for ${subjectIRI}`)
                callback()
                return
            }
            const neo4jType = iriToPrefixed(classIRI, this.prefixes)?.[1] ?? classIRI,
                tempNodeVariable = `node`,
                statements = rdfNodeToCypherStatement(tempNodeVariable, neo4jType, df.namedNode(subjectIRI), this.prefixes, dataset)
            callback(null, statements.join('\n'))
        })
    }
}
