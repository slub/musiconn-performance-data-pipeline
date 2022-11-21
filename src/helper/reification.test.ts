import df from "@rdfjs/data-model";
import datasetFactory from "@rdfjs/dataset";
import N3 from "n3";

import {getReifiedStatementTerms} from "./reification";

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
    mpp:score 10.
_:b923 a rdf:Statement;
    rdf:subject mpe:subject_729;
    rdf:predicate mpp:name;
    rdf:object "Miniatur (Musik)"@de;
    mpp:order 1.
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