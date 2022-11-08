import {Work} from "../types/work";
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

export type WorkS = Work["_source"]

/**
 * converts a work to RDF and adds it to the dataset
 * @param workProps
 * @param dataset
 */
export function workToRDF(workProps: WorkS, dataset: DatasetCore<Quad>) {
    const type = 'work',
        subjectNode = makeEntityNode(type, workProps.uid)

    workProps.names.forEach(({name, order}) => {
        if (!name) return
        if (order === 1) {
            dataset.add(
                df.quad(subjectNode, rdfs.label, df.literal(name.toString())))
        }
        dataset.add(
            df.quad(subjectNode, makePropertyNode('name'), df.literal(name.toString())))
        addEdgeWithReifiedProperties(df.quad(subjectNode, makePropertyNode('name'), df.literal(name.toString())),
            propertyListToPredicateObjectList({
                order: df.literal(order.toString(), xsd.integer),
            }), dataset)
    })

    // create reified statements for the fields descriptions, genres, composers, persons, locations, authorities, dates and libretists  of workProps
    workProps.descriptions?.forEach(d => {
        dataset.add(df.quad(subjectNode, makePropertyNode('description'), df.literal(d.description.toString())))
    })
    workProps.genres?.forEach(g => {
        addNamedSimpleEdge(subjectNode, 'genre', 'subject', g.subject, dataset)
    })
    workProps.composers?.forEach(c => {
        addNamedSimpleEdge(subjectNode, 'composer', 'person', c.person, dataset)
    })

    workProps.persons?.forEach(p => {
        addDefaultSimpleEdge(subjectNode, 'person', p.person, dataset)
    })
    workProps.locations?.forEach(l => {
        addEdgeWithReifiedProperties(df.quad(subjectNode, makePropertyNode('location'), makeEntityNode('location', l.location)),
            propertyListToPredicateObjectList({
                count: l.count ? df.literal(l.count.toString(), xsd.integer) : null,
            }), dataset)
    })
    workProps.authorities?.forEach(a => {
        addDefaultSimpleEdge(subjectNode, 'authority', a.authority, dataset)
    })
    workProps.dates?.forEach(d => {
        addEdgeWithReifiedProperties(df.quad(subjectNode, makePropertyNode('date'), df.literal(d.date.toString(), xsd.date)),
            propertyListToPredicateObjectList({
                label: d.label ? df.literal(d.label.toString()) : null,
            }), dataset)
    })
    workProps.libretists?.forEach(l => {
        addNamedSimpleEdge(subjectNode, 'libretist', 'person', l.person, dataset)
    })
    createRDFGraphFromRaw('work',workProps.uid,  workProps).graph.forEach(quad => dataset.add(quad))
    return subjectNode.value
}
