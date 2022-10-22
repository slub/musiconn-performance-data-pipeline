import {Event, Gallery} from "../types/event";
import {
    addDefaultSimpleEdge,
    addEdgeWithReifiedProperties,
    createRDFGraphFromRaw,
    propertyListToPredicateObjectList,
    toLiteral
} from "./utils";
import {DatasetCore, Quad} from "@rdfjs/types";
import {makeEntityNode, makePropertyNode} from "./vocabulary";
import df from "@rdfjs/data-model";
import {rdfs, xsd} from "@tpluscode/rdf-ns-builders";

export function eventsSourceGalleryToRdf(gallery: Gallery) {
    const {id, source, ...rest} = gallery
    return createRDFGraphFromRaw('Gallery', gallery.id, rest, ['thumbnail', 'image'])
}

export type EventS = Event["_source"]

export async function eventToRDF(eventProps: EventS, dataset: DatasetCore<Quad>) {
    const type = 'event',
        subjectNode = makeEntityNode(type, eventProps.uid)
    if (!eventProps) return []

    eventProps.persons?.forEach(p => {
        addEdgeWithReifiedProperties(df.quad(subjectNode, makePropertyNode('person'), makeEntityNode('person', p.person)),
            propertyListToPredicateObjectList({
                order: df.literal(p.order.toString(), xsd.integer),
                subject: p.subject ? makeEntityNode('subject', p.subject) : null
            }), dataset)
    })
    eventProps.corporations?.forEach(c => {
        addEdgeWithReifiedProperties(df.quad(subjectNode, makePropertyNode('corporation'), makeEntityNode('corporation', c.corporation)),
            propertyListToPredicateObjectList({
                order: df.literal(c.order.toString(), xsd.integer),
                subject: c.subject ? makeEntityNode('subject', c.subject) : null
            }), dataset)
    })
    eventProps.locations?.forEach(l => addDefaultSimpleEdge(subjectNode, 'location', l.location, dataset))
    eventProps.sources?.forEach(s => {
        const reifiedNode = addEdgeWithReifiedProperties(df.quad(subjectNode, makePropertyNode('source'), makeEntityNode('source', s.source)),
            propertyListToPredicateObjectList({
                url: s.url ? df.namedNode(s.url) : null,
                manifest: s.manifest ? df.namedNode(s.manifest) : null,
                page: s.page ? toLiteral(s.page) : null
            }), dataset)
        s.gallery?.forEach(gallery => {
            const {subjectNode: galleryNode, graph: galleryGraph} = eventsSourceGalleryToRdf(gallery)
            dataset.add(df.quad(reifiedNode, makePropertyNode('gallery'), galleryNode))
            galleryGraph.forEach(q => dataset.add(q))
        })
    })
    eventProps.names.forEach(({name, order, subtitle, language, label}) => {
        if (!name) return
        if (order === 1) {
            dataset.add(
                df.quad(subjectNode, rdfs.label, df.literal(name, language)))
        }
        dataset.add(
            df.quad(subjectNode, makePropertyNode('name'), df.literal(name, language)))
        addEdgeWithReifiedProperties(df.quad(subjectNode, makePropertyNode('name'), df.literal(name, language)),
            propertyListToPredicateObjectList({
                order: df.literal(order.toString(), xsd.integer),
                subtitle: subtitle ? df.literal(subtitle) : null,
                label: label ? df.literal(label.toString(), xsd.integer) : null
            }), dataset)
    })
    eventProps.performances?.forEach(({work, order, composers, corporations, descriptions}) => {
        const performanceNode = df.blankNode()
        propertyListToPredicateObjectList({
            work: makeEntityNode('work', work),
            order: df.literal(order.toString(), xsd.integer)
        })
            .forEach(([predicate, object]) => dataset.add(df.quad(performanceNode, predicate, object)))
        composers?.map(({person}) => makeEntityNode('person', person))
            .forEach(objectNode => dataset.add(df.quad(performanceNode, makePropertyNode('composer'), objectNode)))
        corporations?.map(({corporation}) => makeEntityNode('corporation', corporation))
            .forEach(objectNode => dataset.add(df.quad(performanceNode, makePropertyNode('corporation'), objectNode)))
        descriptions?.map(({description}) => df.literal(description))
            .forEach(objectNode => dataset.add(df.quad(performanceNode, makePropertyNode('description'), objectNode)))
        dataset.add(df.quad(subjectNode, makePropertyNode('performance'), performanceNode))
    })
    eventProps.dates?.forEach(({date}) => {
        dataset.add(df.quad(subjectNode, makePropertyNode('date'), df.literal(date, xsd.date)))
    })
    eventProps.times?.forEach(({time}) => {
        dataset.add(df.quad(subjectNode, makePropertyNode('time'), df.literal(time, xsd.time)))
    })
    createRDFGraphFromRaw('event', eventProps.uid, eventProps).graph.forEach(q => dataset.add(q))
}