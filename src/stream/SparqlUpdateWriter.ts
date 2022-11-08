import {Writable} from "stronger-typed-streams";
import {DatasetCore} from "@rdfjs/types";
import N3, {Prefixes} from "n3";
import {sparql} from "@tpluscode/rdf-string";
import fetch from 'isomorphic-unfetch'

export function prefixesToSPARQL(prefixes: Prefixes<string>): string {
    return Object.entries(prefixes).map(([prefix, iri]) => `PREFIX ${prefix}: <${iri}>`).join('\n')
}

function quadsToSPARQLUpdate(dataset: DatasetCore, prefixes: Prefixes<string>) {
    const turtleWriter = new N3.Writer({prefixes}),
         quadsAsTurtle = turtleWriter.quadsToString([...dataset])
    const prefixSection = prefixesToSPARQL(prefixes)
    const turtleWithoutPrefix = quadsAsTurtle.replace(prefixSection, '')
    return sparql`${prefixSection} \n INSERT DATA { ${turtleWithoutPrefix} }`
}


export class SparqlUpdateWriter extends Writable<DatasetCore> {
    private classIRI: string | undefined
    private prefixes: Prefixes<string> = {}
    private sparqlEndpoint: string

    constructor(sparqlEndpoint: string, classIRI: string, prefixes: Prefixes<string>) {
        super({objectMode: true})
        this.sparqlEndpoint = sparqlEndpoint
        this.classIRI = classIRI
        this.prefixes = prefixes
    }

    _write(dataset: DatasetCore, encoding: BufferEncoding, callback: Function) {
        process.nextTick(async () => {
           //console.log(turtle`${dataset}`.toString())
           const query = quadsToSPARQLUpdate(dataset, this.prefixes)
           const result = await fetch(this.sparqlEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/sparql-update'
                },
                body: query.toString()
            })
            if(result.status !== 200) {
                console.error(await result.text())
            }
            callback()
        })
    }

}
