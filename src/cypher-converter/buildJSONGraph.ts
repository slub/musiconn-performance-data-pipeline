import {Driver} from "neo4j-driver";
import df from "@rdfjs/data-model";
import {DatasetCore, Quad} from "@rdfjs/types";
import {geo, xsd} from "@tpluscode/rdf-ns-builders";
import * as RDF from "rdf-js";
import {Prefixes} from "n3";
import {getLiteralProperties} from "../helper/dataset";
import {fromWKTLiteral} from "../rdf-converter/utils";
import {filterUndefOrNull} from "../helper/notEmpty";
import {iriToPrefixed} from "../helper/iri";
import {getReifiedStatementTerms} from "../helper/reification";
import {flatten} from "lodash";

async function seedNeo4jFromJSON(neo4jdriver: Driver, jsonFile: string) {
    const session = neo4jdriver.session()
    try {
        await session.run( `CALL apoc.import.json("file:///${jsonFile}")` )
        return true
    } catch ( e ) {
        console.error( e )
        return false
    } finally {
        session.close()
    }
}

type NodeJSON = {
    type: 'node'
    id: string
    labels: string[]
    properties: Record<string, string>
}
type RelJSON = {
    type: 'relationship'
    id: string
    start: {
        id: string
    },
    end: {
        id: string
    },
    properties: Record<string, string>
    label: string
}
function rdfLiteralToNeo4JSONValue(literal: RDF.Literal): any {
    switch (literal.datatype.value) {
        case xsd.boolean.value:
            return literal.value === "true"
        case xsd.integer.value:
            return parseInt(literal.value)
        case xsd.decimal.value:
            return parseFloat(literal.value)
        case geo.wktLiteral.value:
            const [longitude, latitude] =fromWKTLiteral(literal)
            return { crs: 'wgs-84', latitude, longitude }
        default:
            return literal.value


    }
}


export function rdfNodeToJSON(neo4jType: string, node: RDF.NamedNode, prefixes: Prefixes<string>, dataset: DatasetCore<Quad>): { nodes: NodeJSON[]; rels: RelJSON[] } {
    const properties: { key: string, value: RDF.Literal }[] = getLiteralProperties(node, dataset, prefixes)
    const nodeJSON: NodeJSON = {
        type: 'node',
        id: node.value,
        labels: [neo4jType],
        properties: properties.reduce((acc, {key, value}) => {
            acc[key] = rdfLiteralToNeo4JSONValue(value)
            return acc
        }, {} as Record<string, any>),
    }
    const rels = filterUndefOrNull(Array.from(dataset.match(node, null, null)).map(({
        predicate,
        object
    }) => {
        if (object.termType === 'NamedNode') {
            const edgeType = iriToPrefixed(predicate.value, prefixes)?.[1]
            if(!edgeType) return null

            const reifiedStatements = getReifiedStatementTerms(df.quad(node, predicate, object), dataset)
            const edgeProperties = flatten(reifiedStatements.map(statement => getLiteralProperties(statement as (RDF.NamedNode | RDF.BlankNode), dataset, prefixes)))
            const relationship: RelJSON = {
                type: 'relationship',
                id: `${node.value}_${edgeType}_${object.value}`,
                start: {
                    id: node.value
                },
                end: {
                    id: object.value
                },
                properties: edgeProperties.reduce((acc, {key, value}) => {
                    acc[key] = rdfLiteralToNeo4JSONValue(value)
                    return acc
                }, {} as Record<string, any>),
                label: edgeType
            }
            return relationship
        }
        return null
    }))
    return {
        nodes: [nodeJSON],
        rels
    }
}

export default seedNeo4jFromJSON
