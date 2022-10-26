import {Prefixes} from "n3";

export function iriToPrefixed(iri: string, prefixes: Prefixes<string>): [string, string] | null {
    for (const [prefix, namespace] of Object.entries(prefixes)) {
        if (iri.startsWith(namespace)) {
            return [prefix, iri.slice(namespace.length)]
        }
    }
    return null
}
