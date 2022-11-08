import {DatasetCore, Quad} from "@rdfjs/types";
import {makeEntityNode, makePropertyNode} from "./vocabulary";
import df from "@rdfjs/data-model";
import {rdfs, xsd} from "@tpluscode/rdf-ns-builders";
import {
    addDefaultSimpleEdge,
    addEdgeWithReifiedProperties,
    addNamedSimpleEdge, createRDFGraphFromRaw,
    propertyListToPredicateObjectList
} from "./utils";
import {Source} from "../types/source";


export type SourceS = Source["_source"]


/**
 * converts a source to RDF and adds it to the dataset
 * @param sourceProps
 * @param dataset
 */

export function sourceToRDF(sourceProps: SourceS, dataset: DatasetCore<Quad>) {
    const type = 'source',
        subjectNode = makeEntityNode(type, sourceProps.uid)

    sourceProps.names.forEach(({name, order}) => {
        if (order === 1) {
            dataset.add(
                df.quad(subjectNode, rdfs.label, df.literal(name)))
        }
        dataset.add(
            df.quad(subjectNode, makePropertyNode('name'), df.literal(name)))
        addEdgeWithReifiedProperties(df.quad(subjectNode, makePropertyNode('name'), df.literal(name)),
            propertyListToPredicateObjectList({
                order: df.literal(order.toString(), xsd.integer),
            }), dataset)
    })

    sourceProps.events?.forEach(e => {
        if(e.event) {
            addNamedSimpleEdge(subjectNode, 'event', 'event', e.event, dataset)
        }
    })

    sourceProps.dates?.forEach(({date}) => {
        dataset.add(df.quad(subjectNode, makePropertyNode('date'), df.literal(date, xsd.date)))
    })
    sourceProps.locations?.forEach(l => {
        addNamedSimpleEdge(subjectNode, 'location', 'location', l.location, dataset)
    })

    createRDFGraphFromRaw('source', sourceProps.uid, sourceProps).graph.forEach(q => dataset.add(q))
    return subjectNode.value
}