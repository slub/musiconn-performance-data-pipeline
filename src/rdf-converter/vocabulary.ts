import df from "@rdfjs/data-model";
import {capitalize} from "lodash";
import {rdf, rdfs, xsd} from "@tpluscode/rdf-ns-builders";

const baseURI = "http://onlogies.slub-dresden.de/musiconn.preformance/"
const entityIRI = `${baseURI}entity#`
const classIRI = `${baseURI}class#`
const propsIRI = `${baseURI}props#`

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