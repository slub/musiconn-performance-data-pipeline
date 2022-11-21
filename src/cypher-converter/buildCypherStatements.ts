import df from "@rdfjs/data-model";
import {DatasetCore, Quad} from "@rdfjs/types";
import {geo, xsd} from "@tpluscode/rdf-ns-builders";
import {flatten} from "lodash";
import {Prefixes} from "n3";
import * as RDF from "rdf-js";

import {iriToPrefixed} from "../helper/iri";
import {filterUndefOrNull} from "../helper/notEmpty";
import {getReifiedStatementTerms} from "../helper/reification";


function rdfLiteralToNeo4JLiteral(literal: RDF.Literal): string {
    switch (literal.datatype.value) {
        case xsd.date.value:
            return `date("${literal.value}")`
        case xsd.dateTime.value:
            return `datetime("${literal.value}")`
        case xsd.time.value:
            return `time("${literal.value}")`
        case xsd.boolean.value:
            return literal.value === "true" ? "true" : "false"
        case xsd.duration.value:
            return `duration("${literal.value}")`
        case geo.wktLiteral.value:
            return `point("${literal.value}")`
        case xsd.integer.value:
        case xsd.decimal.value:
        case xsd.double.value:
        case xsd.float.value:
            return literal.value
        default:
            return `"${literal.value.replace(/"/g, '\\"')}"`
    }
}

export function rdfNodeToCypherStatement(tempNodeVariable: string, neo4jType: string, node: RDF.NamedNode, prefixes: Prefixes<string>, dataset: DatasetCore<Quad>): string[] {
    const statements = []
    statements.push(`MERGE (${tempNodeVariable}:${neo4jType} {id: "${node.value}"})`)
    const properties: { key: string, value: RDF.Literal }[] = filterUndefOrNull(Array.from(dataset.match(node, null, null))
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
    statements.push('SET')
    properties.map(({key, value}, index) => {
        const cypherValue = rdfLiteralToNeo4JLiteral(value)
        statements.push(`${tempNodeVariable}.${key} = ${cypherValue}` + (index < properties.length - 1 ? ',' : ''))
    })
    const edges: { edgeType: string, edgeProperties: { key: string, value: RDF.Literal }[], targetId: string }[] =
        filterUndefOrNull(Array.from(dataset.match(node, null, null))
            .map(({
                      predicate,
                      object
                  }) => {
                if (object.termType === 'NamedNode') {
                    const edgeType = iriToPrefixed(predicate.value, prefixes)?.[1]
                    if(!edgeType) return null

                    const reifiedTerms = getReifiedStatementTerms(df.quad(node, predicate, object), dataset)
                    const edgeProperties: { key: string, value: RDF.Literal }[] = flatten(reifiedTerms.map((subject) => {
                        const properties = Array.from(dataset.match(subject, null, null))
                        console.log('edge properties', properties)
                        return filterUndefOrNull(properties.map(({predicate, object}) => {
                            if (object.termType === 'Literal') {
                                const  key = iriToPrefixed(predicate.value, prefixes)?.[1]
                                if(!key) return null
                                return {key, value: object}
                            }
                            return null
                        }))
                    }))
                    return {edgeType, edgeProperties, targetId: object.value}
                }
                return null
            }))

    edges.forEach(({edgeType, edgeProperties, targetId}, index) => {
        const neo4jEdgeType = iriToPrefixed(edgeType, prefixes)?.[1] ?? edgeType,
            tempTargetNodeVariable = `target_${tempNodeVariable}_${index}`,
            tempEdgeVariable = `edge_${tempNodeVariable}_${index}`
        statements.push(`MERGE (${tempTargetNodeVariable} {id: "${targetId}"})`)
        statements.push(`CREATE (${tempNodeVariable})-[${tempEdgeVariable}:${neo4jEdgeType} {`)
        edgeProperties.forEach(({key, value}, index) => {
            const cypherValue = rdfLiteralToNeo4JLiteral(value)
            statements.push(`${tempEdgeVariable}.${key} = ${cypherValue}` + (index < edgeProperties.length - 1 ? ',' : ''))
        })
        statements.push(`}]->(${tempTargetNodeVariable})`)
    })
    return statements
}
