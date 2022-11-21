import df from "@rdfjs/data-model";
import {DatasetCore, Quad} from "@rdfjs/types";
import {geo, rdf, rdfs, sf, xsd} from "@tpluscode/rdf-ns-builders";

import {hashQuads} from "../helper/quadHashes";
import {Location} from "../types/location";
import {
    addDefaultSimpleEdge,
    addEdgeWithReifiedProperties, addNamedSimpleEdge,
    createRDFGraphFromRaw,
    propertyListToPredicateObjectList, toGeoLiteral,
    toLiteral, toWKTLiteral
} from "./utils";
import {makeEntityNode, makePropertyNode} from "./vocabulary";

export type LocationS = Location["_source"]

/**
 * converts a location to RDF and adds it to the dataset
 * @param locationProps
 * @param dataset
 */

export function locationToRDF(locationProps: LocationS, dataset: DatasetCore<Quad>) {
    const type = 'location',
        subjectNode = makeEntityNode(type, locationProps.uid)

    locationProps.names.forEach(({name, order}) => {
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

    locationProps.events?.forEach(e => {
        addDefaultSimpleEdge(subjectNode, 'event', e.event, dataset)
    })

    locationProps.serials?.forEach(e => {
        addDefaultSimpleEdge(subjectNode, 'series', e.series, dataset)
    })

    locationProps.sources?.forEach(s => {
        addDefaultSimpleEdge(subjectNode, 'source', s.source, dataset)
    })

    locationProps.geometries?.forEach(g => {
        if(g.geo.length < 2) return
        const geometryNode = df.namedNode(makeEntityNode('geometry', hashQuads([df.quad(subjectNode, geo.hasGeometry, toWKTLiteral(g.geo as [number, number]))])).value)
        dataset.add(df.quad(subjectNode, geo.hasGeometry, geometryNode))
        dataset.add(df.quad(geometryNode, rdf.type, geo.Geometry))
        dataset.add(df.quad(geometryNode, rdf.type, df.namedNode(sf[""].value + "Polygon")))
        dataset.add(df.quad(geometryNode, makePropertyNode('label'), toLiteral(g.label)))
        dataset.add(df.quad(geometryNode, geo.asWKT, toWKTLiteral(g.geo as [number, number])))
        dataset.add(df.quad(geometryNode, makePropertyNode('geoliteral'), toGeoLiteral(g.geo as [number, number])))
    })

    locationProps.parents?.forEach(p => {
        addNamedSimpleEdge(subjectNode, 'parent', 'location', p.location, dataset)
    })
    locationProps.childs?.forEach(p => {
        addNamedSimpleEdge(subjectNode, 'child', 'location', p.location, dataset)
    })
    locationProps.persons?.forEach(p => {
        addDefaultSimpleEdge(subjectNode, 'person', p.person, dataset)
    })

    createRDFGraphFromRaw('location', locationProps.uid, locationProps).graph.forEach(q => dataset.add(q))
    return subjectNode.value

}