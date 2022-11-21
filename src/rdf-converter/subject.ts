import df from "@rdfjs/data-model";
import {DatasetCore, Quad} from "@rdfjs/types";
import {rdfs, xsd} from "@tpluscode/rdf-ns-builders";

import {Subject} from "../types/subject";
import {
    addDefaultSimpleEdge,
    addEdgeWithReifiedProperties,
    addNamedSimpleEdge, createRDFGraphFromRaw,
    propertyListToPredicateObjectList
} from "./utils";
import {makeEntityNode, makePropertyNode} from "./vocabulary";


type SubjectP = Subject['_source']



/**
 * converts a subject to RDF and adds it to the dataset
 * @param subjectProps
 * @param dataset
 */

export function subjectToRDF(subjectProps: SubjectP, dataset: DatasetCore<Quad>) {
    const subjectNode = makeEntityNode('subject', subjectProps.uid)

    subjectProps.names.forEach(({name, order, language}) => {
        if(order === 1) {
            dataset.add(df.quad(subjectNode, rdfs.label, df.literal(name, language)))
        }
        const reifiedStatement = addEdgeWithReifiedProperties(df.quad(subjectNode, makePropertyNode('name'), df.literal(name, language)), propertyListToPredicateObjectList({}), dataset)
        dataset.add(df.quad(reifiedStatement, makePropertyNode('order'), df.literal(order.toString(), xsd.integer)))

    })

    subjectProps.authorities?.forEach(authority => {
        addDefaultSimpleEdge(subjectNode, 'authority', authority.authority, dataset)
    })

    subjectProps.projects.forEach(project => {
        addDefaultSimpleEdge(subjectNode, 'project', project.project, dataset)
    })

    subjectProps.persons?.forEach(person => {
        addDefaultSimpleEdge(subjectNode, 'person', person.person, dataset)

    })

    subjectProps.parents?.forEach(parent => {
        addNamedSimpleEdge(subjectNode, 'parent', 'subject', parent.subject, dataset)
    })

    subjectProps.childs?.forEach(child => {
        addNamedSimpleEdge(subjectNode, 'child', 'subject', child.subject, dataset)
    })

    subjectProps.events?.forEach(event => {
        addNamedSimpleEdge(subjectNode, 'event', 'event', event.event, dataset)
    })

    subjectProps.corporations?.forEach(corporation => {
        addNamedSimpleEdge(subjectNode, 'corporation', 'corporation', corporation.corporation, dataset)
    })
    subjectProps.serials?.forEach(serial => {
        addNamedSimpleEdge(subjectNode, 'serial', 'serial', serial.series, dataset)
    })

    subjectProps.performances?.forEach(performance => {
        addNamedSimpleEdge(subjectNode, 'performance', 'person', performance.person, dataset)
    })
    createRDFGraphFromRaw('subject', subjectProps.uid, subjectProps).graph.forEach(quad => dataset.add(quad))
    return subjectNode.value
}