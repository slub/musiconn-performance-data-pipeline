/**
 * infere rdfs:range and rdfs:domain from the given dataset
 * 1. iterate through all classes and add type rdfs:Class
 * 2. for each entity of each class, iterate through all properties
 * 3. add a rdfs:range and rdfs:domain to the property to the dataset
 */
import df from "@rdfjs/data-model";
import {DatasetCore, Quad} from "@rdfjs/types";
import {rdf, rdfs} from "@tpluscode/rdf-ns-builders";
import ProgressBar from "ascii-progress";

import {baseURI} from "../../rdf-converter/vocabulary";

export function induceOntology(dataset: DatasetCore<Quad>) {
    const classes = dataset.match(null, rdf.type, null)
    const classNodeSet = new Set<string>()
    for (const classNode of classes) {
        if(classNode.object.termType !== 'NamedNode' )
            continue
        if(!classNode.object.value.startsWith(baseURI))
            continue
        classNodeSet.add(classNode.object.value)
    }
    for (const classIRI of classNodeSet) {
        const classNode = df.namedNode(classIRI)
        dataset.add(df.quad(classNode, rdf.type, rdfs.Class))
        console.log(`will loop through entiies of type ${classNode.value}`)

        const entities = dataset.match(null, rdf.type, classNode)
        const bar = new ProgressBar({
            schema: '[:bar.green] :percent :current/:total :etas :token1',
            total: entities.size
        })
        for (const entity of entities) {
            bar.tick({
                token1: entity.subject.value
            })
            const properties = dataset.match(entity.subject, null, null)
            for (const property of properties) {
                if (property.predicate.equals(rdf.type))
                    continue
                dataset.add(df.quad(property.predicate, rdf.type, rdf.Property))
                if (property.object.termType === 'NamedNode' || property.object.termType === 'BlankNode') {
                    const objectClasses = dataset.match(property.object, rdf.type, null)
                    for (const objectClass of objectClasses) {
                        dataset.add(df.quad(property.predicate, rdfs.range, objectClass.object))
                    }
                } else if(property.object.termType === 'Literal') {
                    dataset.add(df.quad(property.predicate, rdfs.range, property.object.datatype))
                }
                dataset.add(df.quad(property.predicate, rdfs.domain, classNode))
            }
        }
    }
}
