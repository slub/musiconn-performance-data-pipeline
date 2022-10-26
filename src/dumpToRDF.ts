import * as Event from "./types/event";
import * as Person from "./types/person";
import * as Work from "./types/work";
import * as Corporation from "./types/corporation";
import * as Subject from "./types/subject";
import {Quad} from "@rdfjs/types";
import N3 from "n3";
import * as fs from "fs";
import datasetFactory from '@rdfjs/dataset'
import {prefixes} from "./rdf-converter/vocabulary";
import ProgressBar from "ascii-progress";
import {personToRDF} from "./rdf-converter/person";
import {workToRDF} from "./rdf-converter/work";
import {corporationToRDF} from "./rdf-converter/corporation";
import {subjectToRDF} from "./rdf-converter/subject";
import {eventToRDF} from "./rdf-converter/event";
import * as cli from "@asgerf/strongcli";
import {TypeType} from "./helper/basic";

interface Options {
    outputDir: string
    inputDir: string
    type: TypeType
}

const { options, args } = cli.main<Options>({
    outputDir: {
        value: String,
        alias: '-o',
        default: cli.required
    },
    inputDir: {
        value: String,
        alias: '-i',
        default: cli.required
    },
    type: {
        value: x => x as TypeType,
        alias: '-t',
        default: cli.required
    }
})

const {outputDir, inputDir, type} = options

let dataset = datasetFactory.dataset<Quad>([])

type ConverterFunction<T> = (json: string) => T[]
type ToRDFFunction<T> = (entity: T) => void
type GetLabelFUnction<T> = (entity: T) => string

/**
 * Converts a JSON file to RDF and writes it to a file
 * @param type
 * @param toConcrete
 * @param getLabel
 * @param toRDF
 */
const convertToRDF = <T extends object>(type: string, toConcrete: ConverterFunction<T>, getLabel: GetLabelFUnction<T>, toRDF: ToRDFFunction<T>) => {
    const json = fs.readFileSync(`${inputDir}/${type}_data_pretty.json`)
    const entities = toConcrete(json.toString())
    const bar = new ProgressBar({
        schema: '[:bar.green] :percent :current/:total :etas :token1',
        total: entities.length
    })
    entities.forEach(entity => {
        bar.tick({
            token1: getLabel(entity)
        })
        toRDF(entity)
    })

};


async function convertFromFile(type: TypeType) {
    return new Promise((resolve, reject) => {

            switch (type) {
                case 'event':
                    convertToRDF<Event.Event>(
                        type,
                        Event.Convert.toEvent,
                        ({_source: e}) => e.names?.[0]?.name || e.uid.toString(),
                        ({_source: e}) => {
                            if (!e) return
                            eventToRDF(e, dataset)
                        })
                    break
                case 'person':
                    convertToRDF<Person.Person>(
                        type,
                        Person.Convert.toPerson,
                        ({_source: p}) => p.names?.[0]?.name || p.uid.toString(),
                        ({_source: p}) => {
                            if (!p) return
                            personToRDF(p, dataset)
                        })
                    break
                case 'work':
                    convertToRDF<Work.Work>(
                        type,
                        Work.Convert.toWork,
                        ({_source: w}) => w.names?.[0]?.name?.toString() || w.uid.toString(),
                        ({_source: w}) => {
                            if (!w) return
                            workToRDF(w, dataset)

                        })
                    break
                case 'corporation':
                    convertToRDF<Corporation.Corporation>(
                        type,
                        Corporation.Convert.toCorporation,
                        ({_source: c}) => c.names?.[0]?.name || c.uid.toString(),
                        ({_source: c}) => {
                            if (!c) return
                            corporationToRDF(c, dataset)
                        })
                    break
                case 'subject':
                    convertToRDF<Subject.Subject>(
                        type,
                        Subject.Convert.toSubject,
                        ({_source: s}) => s.names?.[0]?.name || s.uid.toString(),
                        ({_source: s}) => {
                            if (!s) return
                            subjectToRDF(s, dataset)
                        })
                    break
                default:
                    throw new Error(`Unknown type ${type}`)
            }

            // console.log('will induce ontology')
            // induceOntology(dataset)
            const outFileName = `${outputDir}/${type}.ttl`,
                outputStream = fs.createWriteStream(outFileName),
                writer = new N3.Writer(outputStream)
            writer.addPrefixes(prefixes)
            writer.addQuads([...dataset.match(null, null, null)])
            writer.end(async (error, result) => {
                //console.log(result)
                outputStream.end()
                dataset = datasetFactory.dataset<Quad>([])
                resolve(null)
            })
        }
    )
}

async function run() {
    return await convertFromFile(type)
}

run().catch(console.log)