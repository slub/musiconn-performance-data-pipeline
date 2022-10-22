import {Client} from '@elastic/elasticsearch'
//import { EventD } from './event'
import {Event} from "./types/event";
import {SearchHit} from "@elastic/elasticsearch/lib/api/types";
import df from "@rdfjs/data-model";
import {NamedNode, Quad} from "@rdfjs/types";
import N3 from "n3";
import {flatten} from "lodash";
import * as fs from "fs";
import datasetFactory from '@rdfjs/dataset'
import {makeEntityNode, makePropertyNode, prefixes} from "./rdf-converter/vocabulary";
import {
    all,
    createRDFGraphFromRaw
} from "./rdf-converter/utils";
import {eventToRDF} from "./rdf-converter/event";


const client = new Client({node: 'http://localhost:9200'})
const outputDir = './data/rdf'
const dataset = datasetFactory.dataset<Quad>([])

async function getHits<T extends SearchHit>(index: string, id: number) {
    const result = await client.search<T["_source"]>({
        index,
        query: {
            match: {"uid": id}
        }
    })
    return result.hits.hits
}


async function expand(obj: SearchHit<any>, index: string, plural: string, subjectNode: NamedNode): Promise<Quad[]> {
    return flatten(await all(obj._source?.[plural]?.map(async (obj: any) => {
        const uid = obj[index] as number
        const edge = df.quad(subjectNode, makePropertyNode(index), makeEntityNode(index, uid))
        return [
            edge,
            ...(flatten((await getHits<any>(index, uid)).map(hit => createRDFGraphFromRaw(index, hit._source.uid, hit._source))))
        ]
    })))
}


async function run() {
    const events = await getHits<Event>('event', 4759)
    events.forEach(event => {
        if (!event._source) return []
        const e = event._source
        //return n3 of propQuads
        eventToRDF(e, dataset)
        const outFileName = `${outputDir}/events/Event${e.uid}.ttl`,
            outputStream = fs.createWriteStream(outFileName),
            writer = new N3.Writer(outputStream)
        writer.addPrefixes(prefixes)
        writer.addQuads([...dataset.match(null, null, null)])
        writer.end(async (error, result) => {
            //console.log(result)
            outputStream.end()
        })
        //console.log(turtle`${dataset}`.toString())
    })

}

run().catch(console.log)