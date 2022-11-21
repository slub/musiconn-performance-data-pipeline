import {Quad} from "@rdfjs/types";
import {createHash} from "crypto";
import N3 from "n3";

/**
 * Creates a sha256 hash from a quad
 * @param quad
 */
export function hashQuad(quad: Quad): string {
    const turtleWriter = new N3.Writer({}),
        quadsAsTurtle = turtleWriter.quadsToString([quad])
    return createHash('sha256').update(quadsAsTurtle).digest('hex')
}

/**
 * Creates a sha256 hash from an RDF quad graph
 * @param quads
 */
export function hashQuads(quads: Quad[]): string {
    const turtleWriter = new N3.Writer({}),
        quadsAsTurtle = turtleWriter.quadsToString(quads)
    return createHash('sha256').update(quadsAsTurtle).digest('hex')
}

