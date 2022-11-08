import {Client} from '@elastic/elasticsearch'
import progress from "progress-stream"
import {Event} from "./types/event";
import {SearchHit} from "@elastic/elasticsearch/lib/api/types";
import {DatasetCore} from "@rdfjs/types";
import {Prefixes} from "n3";
import {
    classIRI,
    entityIRI,
    makeClassNode,
    propsIRI
} from "./rdf-converter/vocabulary";
import {eventToRDF} from "./rdf-converter/event";
import {Readable, Writable} from "stronger-typed-streams";
import {TypeType} from "./helper/basic";
import {SparqlUpdateWriter} from "./stream/SparqlUpdateWriter";
import {ObservableOptions, ObservableStatus, PointedNode} from './helper/types';
import {EntityToRDFTransform} from "./stream/EntityToRDFTransform";


const client = new Client({node: 'http://localhost:9200'})

async function getHits<T extends SearchHit>(index: string, id: number) {
    const result = await client.search<T["_source"]>({
        index,
        query: {
            match: {"uid": id}
        }
    })
    return result.hits.hits
}


/**
 * get all ids from an index
 * @param index - elastic search index
 */
async function getAllIds(index: string): Promise<string[]> {
    const allHits = [],
        scroll = '20s'
    let { _scroll_id, hits} = await client.search({
        index,
        scroll,
        query: {
            match_all: {}
        },
        "stored_fields": []
    })
    while (hits && hits.hits.length) {
        allHits.push(... hits.hits.map(hit => hit._id))
        const res = await client.scroll({scroll_id: _scroll_id, scroll})
        _scroll_id = res._scroll_id
        hits = res.hits
    }
    return allHits
}

class EntityReader<T extends SearchHit> extends Readable<T["_source"]> {
    private i: number = 0
    private scroll: string = '10s'
    private scroll_id: string | undefined
    private options: ObservableOptions = {}

    constructor(type: TypeType, opts: ObservableOptions) {
        super({objectMode: true, ...opts});
        this.options = opts
        try {
            client.search<T["_source"]>({
                index: type,
                scroll: this.scroll,
                query: {
                    match_all: {}
                }
            }).then(({_scroll_id, hits}) => {
                this.scroll_id = _scroll_id
                process.nextTick(() => {
                    this.options.log?.({index: this.options.index, count: hits.hits?.length ?? 0, message: 'start'})
                    hits.hits?.forEach(hit => this.push(hit))
                })
            })
        } catch (e) {
            console.error(e)
        }
    }
    _read(size: number) {
        const { scroll_id, scroll } = this
        if(!scroll_id) return
        try {
            client.scroll({scroll_id, scroll}).then(({_scroll_id, hits}) => {
                this.scroll_id = _scroll_id
                process.nextTick(() => {
                    this.options.log?.({index: this.options.index, count: hits.hits?.length ?? 0, message: 'scroll'})
                    hits.hits?.forEach(hit => this.push(hit))
                })
            })
        } catch (e) {
            console.error(e)
        }
    }

}


class Logger extends Writable<PointedNode> {
    private logCallback: (ds: DatasetCore) => void | undefined
    constructor(logCallback: (ds: DatasetCore) => void) {
        super({objectMode: true})
        this.logCallback = logCallback
    }

    _write({dataset}: PointedNode, encoding: BufferEncoding, callback: Function) {
        process.nextTick(() => {
            if(this.logCallback) {
                this.logCallback(dataset)
            }
            //console.log(turtle`${dataset}`.toString())
            callback()
        })
    }
}


export async function runPipeline(log: (observerStatus: ObservableStatus) => void, ingester: (ds: DatasetCore) => void) {
    const type = 'event'
    const classIri = makeClassNode(type),
        prefixes_string_only: Prefixes<string> = {
            mpp: propsIRI,
            mpe: entityIRI,
            mpc: classIRI
        }
    const { count } = await client.count({index: type})
    const events = new EntityReader<Event>(type, {index: 'input', log})
    const rdfizer = new EntityToRDFTransform<Event>(eventToRDF, {index: 'toRDF', log})
    //  const neo4jWriter = new Neo4JCypherWriter(classIri.value, prefixes_string_only, 'bolt://localhost:7687' )
    // const virtuosoWriter = new SparqlUpdateWriter('http://localhost:9999/blazegraph/namespace/kb/sparql', classIri.value, prefixes_string_only )
    const logger = new Logger(ingester)

    const progStream = (index: string, log: (observerStatus: ObservableStatus) => void) => {
        const ps = progress({
            length: count,
            time: 100,
            // @ts-ignore
            objectMode: true
        })
        ps.on('progress', progress => {
            log({index, count: progress.length,progress, message: 'progress'})
        })
        return ps
    }

    const pipeline = events
        .pipe(progStream('input_toRDF', log))
        .pipe(rdfizer)
        .pipe(progStream('toRDF_output', log))
        .pipe(logger)
    return { pipeline, readable: events}
}