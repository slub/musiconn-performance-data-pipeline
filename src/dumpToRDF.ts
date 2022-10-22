import {Convert} from "./types/event";
import {Quad} from "@rdfjs/types";
import N3 from "n3";
import * as fs from "fs";
import datasetFactory from '@rdfjs/dataset'
import {prefixes} from "./rdf-converter/vocabulary";
import {eventToRDF} from "./rdf-converter/event";
import ProgressBar from "ascii-progress";


const outputDir = './data/rdf'
const dataset = datasetFactory.dataset<Quad>([])




async function run() {
    const type = 'event'
    const eventsJSON = fs.readFileSync(`./data/${type}_data_pretty.json`)
    const events = Convert.toEvent(eventsJSON.toString())
    const bar = new ProgressBar( {
        schema: '[:bar.green] :percent :current/:total :etas :token1',
        total: events.length })


    events.forEach(event => {
        if (!event._source) return []
        const e = event._source
        bar.tick({
            token1: e.names[0].name || e.uid
        })
        //return n3 of propQuads
        eventToRDF(e, dataset)
        //console.log(turtle`${dataset}`.toString())
    })
    const outFileName = `${outputDir}/events/events.ttl`,
        outputStream = fs.createWriteStream(outFileName),
        writer = new N3.Writer(outputStream)
    writer.addPrefixes(prefixes)
    writer.addQuads([...dataset.match(null, null, null)])
    writer.end(async (error, result) => {
        //console.log(result)
        outputStream.end()
    })

}

run().catch(console.log)