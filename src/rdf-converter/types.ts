import {Quad_Object, Quad_Predicate} from "@rdfjs/types";

export type PredicateObjectPair = [Quad_Predicate, Quad_Object]
export type PropertyList = {
    [k: string]: Quad_Object | null
}
