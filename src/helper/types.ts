import {Progress} from "progress-stream";
import {DatasetCore, Quad} from "@rdfjs/types";

export type ObservableStatus = {
    index?: string,
    count: number,
    message: string,
    progress?: Progress
}
export type ObservableOptions = {
    index?: string,
    log?: (observerStatus: ObservableStatus) => void
}

export type PointedNode = {
    subjectIRI: string,
    dataset: DatasetCore<Quad>
}
