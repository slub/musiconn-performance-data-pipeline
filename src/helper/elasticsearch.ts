import {Client} from "@elastic/elasticsearch";
import {SearchHit} from "@elastic/elasticsearch/lib/api/types";

/**
 * get an entity specified by id from an index
 * @param index - elastic search index
 * @param id - entity id
 * @param client - elastic search client
 */
export async function getHits<T extends SearchHit>(index: string, id: number, client: Client): Promise<SearchHit<T["_source"]>[]> {
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
 * @param client - elastic search client
 */
export async function getAllIds(index: string, client: Client): Promise<string[]> {
    const allHits = [],
        scroll = '19s'
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
