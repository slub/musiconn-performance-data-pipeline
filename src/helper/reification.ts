import df from "@rdfjs/data-model";
import {DatasetCore, Quad} from "@rdfjs/types";
import {rdf} from "@tpluscode/rdf-ns-builders";
import * as RDF from "rdf-js";

export function getReifiedStatementTerms(quad: Quad, dataset: DatasetCore<Quad>): RDF.Term[] {
    const {subject, predicate, object} = quad
    return Array.from(dataset
        .match(null, rdf.subject, subject))
        .filter(({subject: term}) => dataset.has(df.quad(term, rdf.predicate, predicate)) && dataset.has(df.quad(term, rdf.object, object)))
        .map(({subject: term}) => term)
}