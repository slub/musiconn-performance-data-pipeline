import { Session } from "neo4j-driver";
import {Writable} from "stronger-typed-streams";

export class Neo4JCypherStreamWriter extends Writable<string> {
    constructor(private readonly session: Session) {
        super({objectMode: true})
    }

    _write(chunk: string, encoding: BufferEncoding, callback: () => void) {
        process.nextTick(async () => {
            try {
                await this.session.run(chunk)
            } catch (e) {
                console.error(`cannot import ${chunk} because of ${e}`)
            }
            callback()
        })
    }
}