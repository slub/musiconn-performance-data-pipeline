import datasetFactory from "@rdfjs/dataset";
import {DatasetCore, Literal, NamedNode, Quad} from "@rdfjs/types";
import df from "@rdfjs/data-model";
import {rdf, xsd} from "@tpluscode/rdf-ns-builders";
import {makeClassNode, makeEntityNode, makePropertyNode} from "./vocabulary";
import {PredicateObjectPair, PropertyList} from "./types";
import {filterUndefOrNull} from "../helper/notEmpty";
import clownface from "clownface";
import * as RdfStatement from "@rdfine/rdf/lib/Statement";

/**
 * convert any JS primitive value to RDF Literal
 * @param value
 */
export function toLiteral(value: any): Literal {
    if (typeof value === 'string')
        return df.literal(value)
    else if (typeof value === 'number')
        return df.literal(value.toString(), value % 1 === 0 ? xsd.integer : xsd.float)
    else if (typeof value === 'boolean')
        return df.literal(value.toString(), xsd.boolean)
    else
        throw new Error(`Cannot convert ${value} to RDF Literal`)
}

export async function all<T>(promises?: Promise<T>[]) {
    return promises ? await Promise.all(promises) : []
}

export function createRDFGraphFromRaw(type: string, uid: number, data: any, keysThatShouldBeUrl?: string[]): { subjectNode: NamedNode, graph: Quad[] } {
    const subject = makeEntityNode(type, uid)
    return {
        subjectNode: subject, graph: [
            ...filterUndefOrNull(Object.entries(data).map(([key, value]) => {
                if (typeof value !== 'object') {
                    if (typeof (value as any) === 'string' && keysThatShouldBeUrl?.includes(key)) {
                        return df.quad<Quad>(subject, makePropertyNode(key), df.namedNode(value as string))
                    }
                    return value !== undefined && value !== null ? df.quad<Quad>(subject, makePropertyNode(key), toLiteral(value)) : null
                }
                return null
            })),
            df.quad(subject, rdf.type, makeClassNode(type))
        ]
    }
}

export function propertyListToPredicateObjectList(propertyList: PropertyList): PredicateObjectPair[] {
    return filterUndefOrNull(
        Object.entries(propertyList).map(([key, value]) => value && [makePropertyNode(key), value]))
}

export function addEdgeWithReifiedProperties(edge: Quad, predicateObjectList: PredicateObjectPair[], dataset: DatasetCore<Quad>) {
    const bn = clownface({dataset}).blankNode()
    const reifiedNode = RdfStatement.fromPointer(bn, {
        types: [rdf.Statement],
        subject: edge.subject,
        predicate: edge.predicate,
        object: edge.object
    })
    predicateObjectList
        .map(([predicate, object]) => df.quad(reifiedNode.id, predicate, object))
        .forEach(q => dataset.add(q))
    return bn.term

}

export function addDefaultSimpleEdge(subjectNode: NamedNode, key: string, id: number, dataset: DatasetCore<Quad>) {
    dataset.add(df.quad(subjectNode, makePropertyNode('key'), makeEntityNode('key', id)))
}