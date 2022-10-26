import {Person} from "../types/person";
import {
    addDefaultSimpleEdge,
    addEdgeWithReifiedProperties, addNamedSimpleEdge,
    createRDFGraphFromRaw,
    propertyListToPredicateObjectList,
    toLiteral
} from "./utils";
import {DatasetCore, Quad} from "@rdfjs/types";
import {makeEntityNode, makePropertyNode} from "./vocabulary";
import df from "@rdfjs/data-model";
import {rdfs, xsd} from "@tpluscode/rdf-ns-builders";

export type PersonS = Person["_source"]

/**
 * converts a person to RDF and adds it to the dataset
 * @param personProps
 * @param dataset
 */
export function personToRDF(personProps: PersonS, dataset: DatasetCore<Quad>) {
    const type = 'person',
        subjectNode = makeEntityNode(type, personProps.uid)

    personProps.names.forEach(({name, order}) => {
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

    personProps.corporations?.forEach(c => {
        addDefaultSimpleEdge(subjectNode, 'corporation', c.corporation, dataset)
    })

    personProps.events?.forEach(e => {
        const reifiedStatementNode = addEdgeWithReifiedProperties(df.quad(subjectNode, makePropertyNode('event'), makeEntityNode('event', e.event)),
            propertyListToPredicateObjectList({}), dataset)
        e.mediums?.forEach(m => {
            addNamedSimpleEdge(reifiedStatementNode, 'medium', 'subject', m.subject, dataset)
        })
    })

    personProps.serials?.forEach(e => {
        const reifiedStatementNode = addEdgeWithReifiedProperties(df.quad(subjectNode, makePropertyNode('series'), makeEntityNode('series', e.series)),
            propertyListToPredicateObjectList({}), dataset)
        e.mediums?.forEach(m => {
            addNamedSimpleEdge(reifiedStatementNode, 'medium', 'subject', m.subject, dataset)
        })
    })

    personProps.sources?.forEach(s => {
        addDefaultSimpleEdge(subjectNode, 'source', s.source, dataset)
    })

    personProps.genders?.forEach(g => {
        addDefaultSimpleEdge(subjectNode, 'label', g.label, dataset)
    })

    personProps.authorities?.forEach(a => {
        addDefaultSimpleEdge(subjectNode, 'authority', a.authority, dataset)
    })

    personProps.descriptions?.forEach(d => {
        dataset.add(df.quad(subjectNode, makePropertyNode('description'), df.literal(d.description, d.language)))
        dataset.add(df.quad(subjectNode, rdfs.comment, df.literal(d.description, d.language)))
    })

    personProps.locations?.forEach(l => {
        addDefaultSimpleEdge(subjectNode, 'location', l.location, dataset)
    })

    personProps.works?.forEach(w => {
        const reifiedStatement = addEdgeWithReifiedProperties(df.quad(subjectNode, makePropertyNode('work'), makeEntityNode('work', w.work)),
            propertyListToPredicateObjectList({}), dataset)
        w.performances?.forEach(p => {
            addNamedSimpleEdge(reifiedStatement, 'performance', 'event', p.event, dataset)
        })
    })

    personProps.performances?.forEach(p => {
        const reifiedStatement = addEdgeWithReifiedProperties(df.quad(subjectNode, makePropertyNode('performance'), makeEntityNode('person', p.person)),
            propertyListToPredicateObjectList({}), dataset)
        p.works?.forEach(w => {
            addNamedSimpleEdge(reifiedStatement, 'work', 'work', w.work, dataset)
        })
    })
    createRDFGraphFromRaw('person', personProps.uid, personProps, [] ).graph.forEach(quad => dataset.add(quad))
}

