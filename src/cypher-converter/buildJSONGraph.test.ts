import N3, {Prefixes} from "n3";
import datasetFactory from "@rdfjs/dataset";
import df from "@rdfjs/data-model";
import {prefixes} from "../rdf-converter/vocabulary";
import buildJSONGraph, {rdfNodeToJSON} from "./buildJSONGraph";

const fixtureTTL = `
@prefix geo: <http://www.opengis.net/ont/geosparql#>.
@prefix sf: <http://www.opengis.net/ont/sf#>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix mpp: <http://ontologies.slub-dresden.de/musiconn.performance/props#>.
@prefix mpe: <http://ontologies.slub-dresden.de/musiconn.performance/entity#>.
@prefix mpc: <http://ontologies.slub-dresden.de/musiconn.performance/class#>.

mpe:location_1332 rdfs:label "Colston Hall (Bristol)";
    mpp:name "Colston Hall (Bristol)", "Colston Hall";
    a mpc:Location;
    <http://ontologies.slub-dresden.de/musiconn.performance/statement-props#name> mpe:statement_edc07f5636d910e42b59832319b8424620e80abe18a0dca67c017e5e4f5a67f6, mpe:statement_650611d40d2ae8fa31b8b41aa5e9ab38fa716656653d6636b4c6b7f38c360723;
    mpp:event mpe:event_1;
    geo:hasGeometry mpe:geometry_410d5621fba717114d95f7a2e9e9d170947ff8219113787d493b38153b717754;
    mpp:parent mpe:location_1331;
    mpp:uid 1332;
    mpp:title "Colston Hall (Bristol)";
    mpp:slug "colston-hall-bristol";
    mpp:score 7.
mpe:statement_edc07f5636d910e42b59832319b8424620e80abe18a0dca67c017e5e4f5a67f6 rdf:subject mpe:location_1332;
    rdf:predicate mpp:name;
    rdf:object "Colston Hall (Bristol)";
    a rdf:Statement, mpc:Statement;
    mpp:order 1.
mpe:statement_650611d40d2ae8fa31b8b41aa5e9ab38fa716656653d6636b4c6b7f38c360723 rdf:subject mpe:location_1332;
    rdf:predicate mpp:name;
    rdf:object "Colston Hall";
    a rdf:Statement, mpc:Statement;
    mpp:order 2.
mpe:geometry_410d5621fba717114d95f7a2e9e9d170947ff8219113787d493b38153b717754 a geo:Geometry, sf:Polygon;
    mpp:label 1;
    geo:asWKT "POINT(51.4545919 -2.5998353)"^^geo:wktLiteral.
_:b924 a rdf:Statement;
    rdf:subject mpe:location_1332;
    rdf:predicate mpp:event;
    rdf:object mpe:event_1;
    mpp:test "success".
`

const fixtureGraph = {
    "nodes": [
        {
            "type": "node",
            "id": "http://ontologies.slub-dresden.de/musiconn.performance/entity#location_1332",
            "labels": [
                "Location"
            ],
            "properties": {
                "label": "Colston Hall (Bristol)",
                "name": "Colston Hall",
                "uid": 1332,
                "title": "Colston Hall (Bristol)",
                "slug": "colston-hall-bristol",
                "score": 7
            }
        }
    ],
    "rels": [
        {
            "type": "relationship",
            "id": "http://ontologies.slub-dresden.de/musiconn.performance/entity#location_1332_type_http://ontologies.slub-dresden.de/musiconn.performance/class#Location",
            "start": {
                "id": "http://ontologies.slub-dresden.de/musiconn.performance/entity#location_1332"
            },
            "end": {
                "id": "http://ontologies.slub-dresden.de/musiconn.performance/class#Location"
            },
            "properties": {},
            "label": "type"
        },
        {
            "type": "relationship",
            "id": "http://ontologies.slub-dresden.de/musiconn.performance/entity#location_1332_event_http://ontologies.slub-dresden.de/musiconn.performance/entity#event_1",
            "start": {
                "id": "http://ontologies.slub-dresden.de/musiconn.performance/entity#location_1332"
            },
            "end": {
                "id": "http://ontologies.slub-dresden.de/musiconn.performance/entity#event_1"
            },
            "properties": {
                "test": "success"
            },
            "label": "event"
        },
        {
            "type": "relationship",
            "id": "http://ontologies.slub-dresden.de/musiconn.performance/entity#location_1332_hasGeometry_http://ontologies.slub-dresden.de/musiconn.performance/entity#geometry_410d5621fba717114d95f7a2e9e9d170947ff8219113787d493b38153b717754",
            "start": {
                "id": "http://ontologies.slub-dresden.de/musiconn.performance/entity#location_1332"
            },
            "end": {
                "id": "http://ontologies.slub-dresden.de/musiconn.performance/entity#geometry_410d5621fba717114d95f7a2e9e9d170947ff8219113787d493b38153b717754"
            },
            "properties": {},
            "label": "hasGeometry"
        },
        {
            "type": "relationship",
            "id": "http://ontologies.slub-dresden.de/musiconn.performance/entity#location_1332_parent_http://ontologies.slub-dresden.de/musiconn.performance/entity#location_1331",
            "start": {
                "id": "http://ontologies.slub-dresden.de/musiconn.performance/entity#location_1332"
            },
            "end": {
                "id": "http://ontologies.slub-dresden.de/musiconn.performance/entity#location_1331"
            },
            "properties": {},
            "label": "parent"
        }
    ]
}

const reader = new N3.Parser()

const dataset = datasetFactory.dataset(reader.parse(fixtureTTL))

test('can convert  node to Neo4J JSON', async () => {
    const subject = df.namedNode('http://ontologies.slub-dresden.de/musiconn.performance/entity#location_1332'),
        prefixes_string_only: Prefixes<string> = Object.fromEntries(Object.entries(prefixes)
            .map(([prefix, iri]) => [prefix, typeof iri === 'string' ? iri : iri.value]))
    const json = rdfNodeToJSON('Location', subject, prefixes_string_only, dataset)
    expect(json).toMatchObject(fixtureGraph)
})