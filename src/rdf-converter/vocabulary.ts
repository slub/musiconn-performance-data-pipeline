import df from "@rdfjs/data-model";
import {capitalize} from "lodash";
import {rdf, rdfs, xsd} from "@tpluscode/rdf-ns-builders";

export const baseURI = "http://ontologies.slub-dresden.de/musiconn.performance/"
export const entityIRI = `${baseURI}entity#`
export const classIRI = `${baseURI}class#`
export const propsIRI = `${baseURI}props#`

export function makePropertyNode(key: string) {
    return df.namedNode(`${propsIRI}${key}`)
}

export function makeEntityNode(type: string, uid: number) {
    return df.namedNode(`${entityIRI}${type}_${uid}`)
}

export function makeClassNode(type: string) {
    return df.namedNode(`${baseURI}class#${capitalize(type)}`)
}

export const prefixes = {
    rdf: rdf[''],
    rdfs: rdfs[''],
    xsd: xsd[''],
    mpp: propsIRI,
    mpe: entityIRI,
    mpc: classIRI
}