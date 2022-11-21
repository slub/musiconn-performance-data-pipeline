import df from "@rdfjs/data-model";
import {DatasetCore, Quad} from "@rdfjs/types";
import {rdfs, xsd} from "@tpluscode/rdf-ns-builders";

import {Corporation} from "../types/corporation";
import {
    addDefaultSimpleEdge,
    addEdgeWithReifiedProperties,
    addNamedSimpleEdge, createRDFGraphFromRaw,
    propertyListToPredicateObjectList
} from "./utils";
import {makeEntityNode, makePropertyNode} from "./vocabulary";


export type CorporationS = Corporation["_source"]




/**
 * converts a corporation to RDF and adds it to the dataset
 * @param corporationProps
 * @param dataset
 */

export function corporationToRDF(corporationProps: CorporationS, dataset: DatasetCore<Quad>) {
    const type = 'corporation',
        subjectNode = makeEntityNode(type, corporationProps.uid)

    corporationProps.names.forEach(({name, order}) => {
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

    corporationProps.events?.forEach(e => {
        const reifiedStatementNode = addEdgeWithReifiedProperties(df.quad(subjectNode, makePropertyNode('event'), makeEntityNode('event', e.event)),
            propertyListToPredicateObjectList({}), dataset)
        e.mediums?.forEach(m => {
            addNamedSimpleEdge(reifiedStatementNode, 'medium', 'subject', m.subject, dataset)
        })
    })

    corporationProps.serials?.forEach(e => {
        const reifiedStatementNode = addEdgeWithReifiedProperties(df.quad(subjectNode, makePropertyNode('series'), makeEntityNode('series', e.series)),
            propertyListToPredicateObjectList({}), dataset)
        e.mediums?.forEach(m => {
            addNamedSimpleEdge(reifiedStatementNode, 'medium', 'subject', m.subject, dataset)
        })
    })

    corporationProps.sources?.forEach(s => {
        addDefaultSimpleEdge(subjectNode, 'source', s.source, dataset)
    })

    corporationProps.persons?.forEach(p => {
        addDefaultSimpleEdge(subjectNode, 'person', p.person, dataset)
    })

    //performances
    corporationProps.performances?.forEach(p => {
        const reifiedStatement = addEdgeWithReifiedProperties(df.quad(subjectNode, makePropertyNode('performance'), makeEntityNode('person', p.person)),
            propertyListToPredicateObjectList({}), dataset)
        p.works?.forEach(w => {
            addDefaultSimpleEdge(reifiedStatement, 'work', w.work, dataset)
        })
    })

    //authority
    corporationProps.authorities?.forEach(a => {
        addDefaultSimpleEdge(subjectNode, 'authority', a.authority, dataset)

    })

    //descriptions
    corporationProps.descriptions?.forEach(d => {
        dataset.add(df.quad(subjectNode, makePropertyNode('description'), df.literal(d.description, d.language)))
    })

    createRDFGraphFromRaw('corporation', corporationProps.uid, corporationProps).graph.forEach(q => dataset.add(q))
    return subjectNode.value
}