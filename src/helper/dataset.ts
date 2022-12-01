import {DatasetCore, Quad} from "@rdfjs/types";
import * as RDF from "rdf-js";
import {filterUndefOrNull} from "./notEmpty";
import {iriToPrefixed} from "./iri";
import {Prefixes} from "n3";

export function getLiteralProperties(node: RDF.NamedNode | RDF.BlankNode, dataset: DatasetCore<Quad>, prefixes: Prefixes<string>): { key: string, value: RDF.Literal }[] {
    return filterUndefOrNull(Array.from(dataset.match(node, null, null))
        .map(({
                  predicate,
                  object
              }) => {
            if (object.termType === 'Literal') {
                const key = iriToPrefixed(predicate.value, prefixes)?.[1]
                if(!key) return null
                return {key, value: object}
            }
            return null
        }))
}
