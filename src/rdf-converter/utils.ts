import * as RdfStatement from "@rdfine/rdf/lib/Statement";
import df from "@rdfjs/data-model";
import {BlankNode, DatasetCore, Literal, NamedNode, Quad} from "@rdfjs/types";
import {geo, rdf, rdfs, xsd} from "@tpluscode/rdf-ns-builders";
import clownface from "clownface";

import {filterUndefOrNull} from "../helper/notEmpty";
import {hashQuad} from "../helper/quadHashes";
import {PredicateObjectPair, PropertyList} from "./types";
import {makeClassNode, makeEntityNode, makePropertyNode} from "./vocabulary";

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

const geoLiteralIRI = 'http://wwww.bigdata.com/rdf/geospatial/literals/v1#'
export function toGeoLiteral(geo: [number, number]) {
    return df.literal(`${geo[0]}#${geo[1]}` , df.namedNode(geoLiteralIRI + 'lat-lon'))
}

export function toWKTLiteral(coords: [number, number]) {
    return df.literal(`POINT(${coords[0]} ${coords[1]})`, geo.wktLiteral)
}


export async function all<T>(promises?: Promise<T>[]) {
    return promises ? await Promise.all(promises) : []
}

export function createRDFGraphFromRaw(type: string, uid: number, data: any, keysThatShouldBeUrl?: string[]): { subjectNode: NamedNode, graph: Quad[] } {
    const subject = makeEntityNode(type, uid),
        classNode = makeClassNode(type)
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
            df.quad<Quad>(subject, rdf.type, classNode),
            df.quad<Quad>(classNode, rdf.type, rdfs.Class)
        ]
    }
}

export function propertyListToPredicateObjectList(propertyList: PropertyList): PredicateObjectPair[] {
    return filterUndefOrNull(
        Object.entries(propertyList).map(([key, value]) => value && [makePropertyNode(key), value]))
}

export function addEdgeWithReifiedProperties(edge: Quad, predicateObjectList: PredicateObjectPair[], dataset: DatasetCore<Quad>) {
    const statementPointer = clownface({dataset}).namedNode(makeEntityNode('statement', hashQuad(edge)))
    const reifiedNode = RdfStatement.fromPointer(statementPointer, {
        types: [rdf.Statement],
        subject: edge.subject,
        predicate: edge.predicate,
        object: edge.object
    })
    dataset.add(df.quad(edge.subject, df.namedNode(edge.predicate.value.replace('props#', 'statement-props#')), reifiedNode.id))
    dataset.add(df.quad(reifiedNode.id, rdf.type, makeClassNode('Statement')))
    predicateObjectList
        .map(([predicate, object]) => df.quad(reifiedNode.id, predicate, object))
        .forEach(q => dataset.add(q))
    return statementPointer.term

}

export function addDefaultSimpleEdge(subjectNode: NamedNode | BlankNode, key: string, id: number, dataset: DatasetCore<Quad>) {
    dataset.add(df.quad(subjectNode, makePropertyNode(key), makeEntityNode(key, id)))
}

export function addNamedSimpleEdge(subjectNode: NamedNode | BlankNode, name: string, key: string, id: number, dataset: DatasetCore<Quad>) {
    dataset.add(df.quad(subjectNode, makePropertyNode(name), makeEntityNode(key, id)))
}


