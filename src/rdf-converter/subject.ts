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
import {Subject} from "../types/subject";


type SubjectP = Subject['_source']



/**
 * converts a subject to RDF and adds it to the dataset
 * @param subjectProps
 * @param dataset
 */

export function subjectToRDF(subjectProps: SubjectP, dataset: DatasetCore<Quad>) {
    const subject = makeEntityNode('subject', subjectProps.uid),
        subjectType = makePropertyNode('subject')

    subjectProps.names.forEach(({name, order, language}) => {
        if(order === 1) {
            dataset.add(df.quad(subject, rdfs.label, df.literal(name, language)))
        }
        const reifiedStatement = addEdgeWithReifiedProperties(df.quad(subject, makePropertyNode('name'), df.literal(name, language)), propertyListToPredicateObjectList({}), dataset)
        dataset.add(df.quad(reifiedStatement, makePropertyNode('order'), df.literal(order.toString(), xsd.integer)))

    })

    /*
    repeat the same for other properties:

    authorities?:  Authority[];
    categories:    Category[];
    projects:      Project[];
    persons?:      Person[];
    parents?:      SourceParent[];
    performances?: Performance[];
    descriptions?: Description[];
    childs?:       SourceChild[];
    events?:       Event[];
    corporations?: Corporation[];
    serials?:      Serial[];
     */
    subjectProps.authorities?.forEach(authority => {
        addDefaultSimpleEdge(subject, 'authority', authority.authority, dataset)
    })

    subjectProps.projects.forEach(project => {
        addDefaultSimpleEdge(subject, 'project', project.project, dataset)
    })

    subjectProps.persons?.forEach(person => {
        addDefaultSimpleEdge(subject, 'person', person.person, dataset)

    })

    subjectProps.parents?.forEach(parent => {
        addNamedSimpleEdge(subject, 'parent', 'subject', parent.subject, dataset)
    })

    subjectProps.childs?.forEach(child => {
        addNamedSimpleEdge(subject, 'child', 'subject', child.subject, dataset)
    })

    subjectProps.events?.forEach(event => {
        addNamedSimpleEdge(subject, 'event', 'event', event.event, dataset)
    })

    subjectProps.corporations?.forEach(corporation => {
        addNamedSimpleEdge(subject, 'corporation', 'corporation', corporation.corporation, dataset)
    })
    subjectProps.serials?.forEach(serial => {
        addNamedSimpleEdge(subject, 'serial', 'serial', serial.series, dataset)
    })

    subjectProps.performances?.forEach(performance => {
        addNamedSimpleEdge(subject, 'performance', 'person', performance.person, dataset)
    })
    createRDFGraphFromRaw('subject', subjectProps.uid, subjectProps).graph.forEach(quad => dataset.add(quad))

}