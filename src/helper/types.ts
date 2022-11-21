import {DatasetCore} from "@rdfjs/types";
import {Progress} from "progress-stream";

export type ObservableStatus = {
    index?: string,
    count: number,
    message: string,
    progress?: Progress
}
export type ObservableOptions = {
    index?: string,
    log?: (_observerStatus: ObservableStatus) => void
}

export type PointedNode = {
    subjectIRI: string,
    dataset: DatasetCore
}
