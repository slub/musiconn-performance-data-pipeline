import df from "@rdfjs/data-model";
import datasetFactory from "@rdfjs/dataset";
import N3, {Prefixes} from "n3";
import {prefixes} from "../rdf-converter/vocabulary";
import * as RDF from "rdf-js";

import {getReifiedStatementTerms} from "./reification";
import {getLiteralProperties} from "./dataset";

const fixtureTTL = `
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix mpp: <http://ontologies.slub-dresden.de/musiconn.performance/props#>.
@prefix mpe: <http://ontologies.slub-dresden.de/musiconn.performance/entity#>.
@prefix mpc: <http://ontologies.slub-dresden.de/musiconn.performance/class#>.
mpe:subject_729 rdfs:label "Miniatur (Musik)"@de;
    a mpc:Subject;
    mpp:uid 729;
    mpp:title "Miniatur (Musik)";
    mpp:slug "miniatur-musik";
    mpp:score 10;
    mpp:event mpe:event_1.
_:b923 a rdf:Statement;
    rdf:subject mpe:subject_729;
    rdf:predicate mpp:name;
    rdf:object "Miniatur (Musik)"@de;
    mpp:order 1.
_:b924 a rdf:Statement;
    rdf:subject mpe:subject_729;
    rdf:predicate mpp:event;
    rdf:object mpe:event_1;
    mpp:test "success".
`
const reader = new N3.Parser()

const dataset = datasetFactory.dataset(reader.parse(fixtureTTL))

test('can get reified statement terms', async () => {
    const terms = getReifiedStatementTerms(df.quad(
        df.namedNode('http://ontologies.slub-dresden.de/musiconn.performance/entity#subject_729'),
        df.namedNode('http://ontologies.slub-dresden.de/musiconn.performance/props#name'),
        df.literal('Miniatur (Musik)', 'de')), dataset)
    expect(terms).toHaveLength(1)

    const properties = dataset.match(terms[0], null, null)
    expect(properties.size).toBe(5)
})

test('can get properties of edges', async () => {
    const terms = getReifiedStatementTerms(df.quad(
        df.namedNode('http://ontologies.slub-dresden.de/musiconn.performance/entity#subject_729'),
        df.namedNode('http://ontologies.slub-dresden.de/musiconn.performance/props#event'),
        df.namedNode('http://ontologies.slub-dresden.de/musiconn.performance/entity#event_1')), dataset)
    expect(terms).toHaveLength(1)

    const prefixes_string_only: Prefixes<string> =
        Object.fromEntries(Object.entries(prefixes)
            .map(([prefix, iri]) => [prefix, typeof iri === 'string' ? iri : iri.value]))

    const properties = getLiteralProperties(terms[0] as RDF.BlankNode, dataset, prefixes_string_only)
    expect(properties.find(x => x.key === 'test')?.value.value).toBe('success')

})