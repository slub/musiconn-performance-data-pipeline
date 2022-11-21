import {Client} from '@elastic/elasticsearch'
import {SearchHit} from "@elastic/elasticsearch/lib/api/types";
import {DatasetCore} from "@rdfjs/types";
import progress from "progress-stream"
import {Readable, Writable} from "stronger-typed-streams";

import {TypeType} from "./helper/basic";
import {ObservableOptions, ObservableStatus, PointedNode} from './helper/types';
import {eventToRDF} from "./rdf-converter/event";
import {EntityToRDFTransform} from "./stream/EntityToRDFTransform";
import {Event} from "./types/event";


class EntityReader<T extends SearchHit> extends Readable<T["_source"]> {
    private scroll = '10s'
    private scroll_id: string | undefined

    constructor(type: TypeType, private readonly options: ObservableOptions, private readonly client: Client) {
        super({objectMode: true, ...options});
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
    _read() {
        const { scroll_id, scroll } = this
        if(!scroll_id) return
        try {
            this.client.scroll({scroll_id, scroll}).then(({_scroll_id, hits}) => {
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
    constructor(private readonly  logCallback: (ds: DatasetCore) => void) {
        super({objectMode: true})
    }

    _write({dataset}: PointedNode, encoding: BufferEncoding, callback: () => void) {
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
    /*const classIri = makeClassNode(type),
        prefixes_string_only: Prefixes<string> = {
            mpp: propsIRI,
            mpe: entityIRI,
            mpc: classIRI
        }

     const neo4jWriter = new Neo4JCypherWriter(classIri.value, prefixes_string_only, 'bolt://localhost:7687' )
    const virtuosoWriter = new SparqlUpdateWriter('http://localhost:9999/blazegraph/namespace/kb/sparql', classIri.value, prefixes_string_only )

     */
    const client: Client = new Client({node: 'http://localhost:9200'})
    const { count } = await client.count({index: type})
    const events = new EntityReader<Event>(type, {index: 'input', log}, client)
    const rdfizer = new EntityToRDFTransform<Event>(eventToRDF, {index: 'toRDF', log})
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