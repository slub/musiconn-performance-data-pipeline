import {SearchHit} from "@elastic/elasticsearch/lib/api/types";
import datasetFactory from "@rdfjs/dataset";
import {DatasetCore, Quad} from "@rdfjs/types";
import {TransformCallback} from "stream";
import {Transform} from "stronger-typed-streams";

import {ObservableOptions, PointedNode} from "../helper/types";

type ToRDFFunction<T> = (_entity: T, _dataset: DatasetCore) => string
export class EntityToRDFTransform<T extends SearchHit> extends Transform<T["_source"], PointedNode> {
    private toRdf: ToRDFFunction<T["_source"]> | undefined
    private entities: T[]  = []
    private options: ObservableOptions = {}
    constructor(_toRdf: ToRDFFunction<T["_source"]>, opts: ObservableOptions) {
        super({objectMode: true})
        this.options = opts
        this.toRdf = _toRdf
    }

    _flush(callback: TransformCallback) {
        process.nextTick(() => {
            this.entities.forEach(entity => {
                if(!this.toRdf) return
                const dataset = datasetFactory.dataset<Quad>([])
                const subjectIRI = this.toRdf(entity['_source'], dataset)
                this.options.log?.({
                    index: this.options.index,
                    count: 1,
                    message: `imported ${(entity['_source'] as any)?.slug || entity._id} ${subjectIRI}`
                })
                this.push({
                    subjectIRI,
                    dataset
                })
            })
            this.entities = []
            callback()
        })
    }

    _transform(entity: T, encoding: BufferEncoding, callback: TransformCallback) {
        process.nextTick(() => {
            this.entities.push(entity)
            if(this.entities.length > 10) {
                this._flush(callback)
                return
            }
            callback()
        })
    }
}
