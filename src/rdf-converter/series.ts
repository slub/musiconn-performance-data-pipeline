import df from "@rdfjs/data-model";
import {DatasetCore, Quad} from "@rdfjs/types";
import {rdfs, xsd} from "@tpluscode/rdf-ns-builders";
import dayjs from "dayjs";

import {Series} from "../types/series";
import {
    addDefaultSimpleEdge,
    addEdgeWithReifiedProperties,
    addNamedSimpleEdge, createRDFGraphFromRaw,
    propertyListToPredicateObjectList
} from "./utils";
import {makeEntityNode, makePropertyNode} from "./vocabulary";

export type SeriesS = Series["_source"]

/**
 * converts a series to RDF and adds it to the dataset
 * @param seriesProps
 * @param dataset
 */

export function seriesToRDF(seriesProps: SeriesS, dataset: DatasetCore<Quad>) {
    const type = 'series',
        subjectNode = makeEntityNode(type, seriesProps.uid)

    seriesProps.names.forEach(({name, order}) => {
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

    seriesProps.events?.forEach(e => {
        addNamedSimpleEdge(subjectNode, 'event', 'event', e.event, dataset)
    })

    seriesProps.sources?.forEach(s => {
        addDefaultSimpleEdge(subjectNode, 'source', s.source, dataset)
    })
    seriesProps.dates?.forEach(({date}) => {
        dataset.add(df.quad(subjectNode, makePropertyNode('date'), df.literal(dayjs(date).format('YYYY-MM-DD'), xsd.date)))
    })
    seriesProps.parents?.forEach(p => {
        addNamedSimpleEdge(subjectNode, 'parent', 'series', p.series, dataset)
    })
    seriesProps.locations?.forEach(l => {
        addNamedSimpleEdge(subjectNode, 'location', 'location', l.location, dataset)
    })

    createRDFGraphFromRaw('series', seriesProps.uid, seriesProps).graph.forEach(q => dataset.add(q))
    return subjectNode.value
}
