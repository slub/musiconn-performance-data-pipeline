// To parse this data:
//
//   import { Convert } from "./file";
//
//   const event = Convert.toEvent(json);
//
// These functions will throw an error if the JSON doesn't
// match the expected interface, even if the JSON is valid.

export interface Event {
    _index:    Index;
    _type:     Type;
    _id:       string;
    _score:    number;
    _source:   Source;
    _ignored?: Ignored[];
}

export enum Ignored {
    DescriptionsDescriptionKeyword = "descriptions.description.keyword",
    NamesSubtitleKeyword = "names.subtitle.keyword",
}

export enum Index {
    Event = "event",
}

export interface Source {
    uid:           number;
    title:         string;
    slug:          string;
    score?:        number;
    categories:    Category[];
    corporations?: SourceCorporation[];
    dates?:        DateElement[];
    locations?:    Location[];
    names:         Name[];
    projects?:     Project[];
    serials?:      Serial[];
    sources?:      SourceElement[];
    times?:        Time[];
    performances?: Performance[];
    persons?:      SourcePerson[];
    descriptions?: SourceDescription[];
}

export interface Category {
    label: number;
}

export interface SourceCorporation {
    corporation: number;
    subject?:    number;
    order:       number;
}

export interface DateElement {
    date:  string;
    label: number;
}

export interface SourceDescription {
    description: string;
    language:    Language;
}

export enum Language {
    De = "de",
}

export interface Location {
    location: number;
}

export interface Name {
    name?:     string;
    language:  Language;
    order:     number;
    label?:    number;
    subtitle?: string;
}

export interface Performance {
    work:          number;
    order:         number;
    composers?:    Composer[];
    corporations?: PerformanceCorporation[];
    persons?:      PerformancePerson[];
    descriptions?: PerformanceDescription[];
}

export interface Composer {
    person: number;
}

export interface PerformanceCorporation {
    corporation: number;
}

export interface PerformanceDescription {
    description: string;
}

export interface PerformancePerson {
    person?: number;
    mediums: Medium[];
}

export interface Medium {
    subject: number;
}

export interface SourcePerson {
    person:   number;
    subject?: number;
    order:    number;
}

export interface Project {
    project: number;
}

export interface Serial {
    series: number;
}

export interface SourceElement {
    source:    number;
    url?:      string;
    manifest?: string;
    gallery?:  Gallery[];
    page?:     number | string;
}

export interface Gallery {
    id:        number;
    source:    number;
    title?:    string;
    thumbnail: string;
    image:     string;
    order:     number;
}

export interface Time {
    time:  string;
    label: number;
}

export enum Type {
    Doc = "_doc",
}

// Converts JSON strings to/from your types
// and asserts the results of JSON.parse at runtime
export class Convert {
    public static toEvent(json: string): Event[] {
        return cast(JSON.parse(json), a(r("Event")));
    }

    public static eventToJson(value: Event[]): string {
        return JSON.stringify(uncast(value, a(r("Event"))), null, 2);
    }
}

function invalidValue(typ: any, val: any, key: any = ''): never {
    if (key) {
        throw Error(`Invalid value for key "${key}". Expected type ${JSON.stringify(typ)} but got ${JSON.stringify(val)}`);
    }
    throw Error(`Invalid value ${JSON.stringify(val)} for type ${JSON.stringify(typ)}`, );
}

function jsonToJSProps(typ: any): any {
    if (typ.jsonToJS === undefined) {
        const map: any = {};
        typ.props.forEach((p: any) => map[p.json] = { key: p.js, typ: p.typ });
        typ.jsonToJS = map;
    }
    return typ.jsonToJS;
}

function jsToJSONProps(typ: any): any {
    if (typ.jsToJSON === undefined) {
        const map: any = {};
        typ.props.forEach((p: any) => map[p.js] = { key: p.json, typ: p.typ });
        typ.jsToJSON = map;
    }
    return typ.jsToJSON;
}

function transform(val: any, typ: any, getProps: any, key: any = ''): any {
    function transformPrimitive(typ: string, val: any): any {
        if (typeof typ === typeof val) return val;
        return invalidValue(typ, val, key);
    }

    function transformUnion(typs: any[], val: any): any {
        // val must validate against one typ in typs
        const l = typs.length;
        for (let i = 0; i < l; i++) {
            const typ = typs[i];
            try {
                return transform(val, typ, getProps);
            } catch (_) {}
        }
        return invalidValue(typs, val);
    }

    function transformEnum(cases: string[], val: any): any {
        if (cases.indexOf(val) !== -1) return val;
        return invalidValue(cases, val);
    }

    function transformArray(typ: any, val: any): any {
        // val must be an array with no invalid elements
        if (!Array.isArray(val)) return invalidValue("array", val);
        return val.map(el => transform(el, typ, getProps));
    }

    function transformDate(val: any): any {
        if (val === null) {
            return null;
        }
        const d = new Date(val);
        if (isNaN(d.valueOf())) {
            return invalidValue("Date", val);
        }
        return d;
    }

    function transformObject(props: { [k: string]: any }, additional: any, val: any): any {
        if (val === null || typeof val !== "object" || Array.isArray(val)) {
            return invalidValue("object", val);
        }
        const result: any = {};
        Object.getOwnPropertyNames(props).forEach(key => {
            const prop = props[key];
            const v = Object.prototype.hasOwnProperty.call(val, key) ? val[key] : undefined;
            result[prop.key] = transform(v, prop.typ, getProps, prop.key);
        });
        Object.getOwnPropertyNames(val).forEach(key => {
            if (!Object.prototype.hasOwnProperty.call(props, key)) {
                result[key] = transform(val[key], additional, getProps, key);
            }
        });
        return result;
    }

    if (typ === "any") return val;
    if (typ === null) {
        if (val === null) return val;
        return invalidValue(typ, val);
    }
    if (typ === false) return invalidValue(typ, val);
    while (typeof typ === "object" && typ.ref !== undefined) {
        typ = typeMap[typ.ref];
    }
    if (Array.isArray(typ)) return transformEnum(typ, val);
    if (typeof typ === "object") {
        return typ.hasOwnProperty("unionMembers") ? transformUnion(typ.unionMembers, val)
            : typ.hasOwnProperty("arrayItems")    ? transformArray(typ.arrayItems, val)
            : typ.hasOwnProperty("props")         ? transformObject(getProps(typ), typ.additional, val)
            : invalidValue(typ, val);
    }
    // Numbers can be parsed by Date but shouldn't be.
    if (typ === Date && typeof val !== "number") return transformDate(val);
    return transformPrimitive(typ, val);
}

function cast<T>(val: any, typ: any): T {
    return transform(val, typ, jsonToJSProps);
}

function uncast<T>(val: T, typ: any): any {
    return transform(val, typ, jsToJSONProps);
}

function a(typ: any) {
    return { arrayItems: typ };
}

function u(...typs: any[]) {
    return { unionMembers: typs };
}

function o(props: any[], additional: any) {
    return { props, additional };
}

function m(additional: any) {
    return { props: [], additional };
}

function r(name: string) {
    return { ref: name };
}

const typeMap: any = {
    "Event": o([
        { json: "_index", js: "_index", typ: r("Index") },
        { json: "_type", js: "_type", typ: r("Type") },
        { json: "_id", js: "_id", typ: "" },
        { json: "_score", js: "_score", typ: 0 },
        { json: "_source", js: "_source", typ: r("Source") },
        { json: "_ignored", js: "_ignored", typ: u(undefined, a(r("Ignored"))) },
    ], false),
    "Source": o([
        { json: "uid", js: "uid", typ: 0 },
        { json: "title", js: "title", typ: "" },
        { json: "slug", js: "slug", typ: "" },
        { json: "score", js: "score", typ: u(undefined, 0) },
        { json: "categories", js: "categories", typ: a(r("Category")) },
        { json: "corporations", js: "corporations", typ: u(undefined, a(r("SourceCorporation"))) },
        { json: "dates", js: "dates", typ: u(undefined, a(r("DateElement"))) },
        { json: "locations", js: "locations", typ: u(undefined, a(r("Location"))) },
        { json: "names", js: "names", typ: a(r("Name")) },
        { json: "projects", js: "projects", typ: u(undefined, a(r("Project"))) },
        { json: "serials", js: "serials", typ: u(undefined, a(r("Serial"))) },
        { json: "sources", js: "sources", typ: u(undefined, a(r("SourceElement"))) },
        { json: "times", js: "times", typ: u(undefined, a(r("Time"))) },
        { json: "performances", js: "performances", typ: u(undefined, a(r("Performance"))) },
        { json: "persons", js: "persons", typ: u(undefined, a(r("SourcePerson"))) },
        { json: "descriptions", js: "descriptions", typ: u(undefined, a(r("SourceDescription"))) },
    ], false),
    "Category": o([
        { json: "label", js: "label", typ: 0 },
    ], false),
    "SourceCorporation": o([
        { json: "corporation", js: "corporation", typ: 0 },
        { json: "subject", js: "subject", typ: u(undefined, 0) },
        { json: "order", js: "order", typ: 0 },
    ], false),
    "DateElement": o([
        { json: "date", js: "date", typ: "" },
        { json: "label", js: "label", typ: 0 },
    ], false),
    "SourceDescription": o([
        { json: "description", js: "description", typ: "" },
        { json: "language", js: "language", typ: r("Language") },
    ], false),
    "Location": o([
        { json: "location", js: "location", typ: 0 },
    ], false),
    "Name": o([
        { json: "name", js: "name", typ: u(undefined, "") },
        { json: "language", js: "language", typ: r("Language") },
        { json: "order", js: "order", typ: 0 },
        { json: "label", js: "label", typ: u(undefined, 0) },
        { json: "subtitle", js: "subtitle", typ: u(undefined, "") },
    ], false),
    "Performance": o([
        { json: "work", js: "work", typ: 0 },
        { json: "order", js: "order", typ: 0 },
        { json: "composers", js: "composers", typ: u(undefined, a(r("Composer"))) },
        { json: "corporations", js: "corporations", typ: u(undefined, a(r("PerformanceCorporation"))) },
        { json: "persons", js: "persons", typ: u(undefined, a(r("PerformancePerson"))) },
        { json: "descriptions", js: "descriptions", typ: u(undefined, a(r("PerformanceDescription"))) },
    ], false),
    "Composer": o([
        { json: "person", js: "person", typ: 0 },
    ], false),
    "PerformanceCorporation": o([
        { json: "corporation", js: "corporation", typ: 0 },
    ], false),
    "PerformanceDescription": o([
        { json: "description", js: "description", typ: "" },
    ], false),
    "PerformancePerson": o([
        { json: "person", js: "person", typ: u(undefined, 0) },
        { json: "mediums", js: "mediums", typ: a(r("Medium")) },
    ], false),
    "Medium": o([
        { json: "subject", js: "subject", typ: 0 },
    ], false),
    "SourcePerson": o([
        { json: "person", js: "person", typ: 0 },
        { json: "subject", js: "subject", typ: u(undefined, 0) },
        { json: "order", js: "order", typ: 0 },
    ], false),
    "Project": o([
        { json: "project", js: "project", typ: 0 },
    ], false),
    "Serial": o([
        { json: "series", js: "series", typ: 0 },
    ], false),
    "SourceElement": o([
        { json: "source", js: "source", typ: 0 },
        { json: "url", js: "url", typ: u(undefined, "") },
        { json: "manifest", js: "manifest", typ: u(undefined, "") },
        { json: "gallery", js: "gallery", typ: u(undefined, a(r("Gallery"))) },
        { json: "page", js: "page", typ: u(undefined, u(0, "")) },
    ], false),
    "Gallery": o([
        { json: "id", js: "id", typ: 0 },
        { json: "source", js: "source", typ: 0 },
        { json: "title", js: "title", typ: u(undefined, "") },
        { json: "thumbnail", js: "thumbnail", typ: "" },
        { json: "image", js: "image", typ: "" },
        { json: "order", js: "order", typ: 0 },
    ], false),
    "Time": o([
        { json: "time", js: "time", typ: "" },
        { json: "label", js: "label", typ: 0 },
    ], false),
    "Ignored": [
        "descriptions.description.keyword",
        "names.subtitle.keyword",
    ],
    "Index": [
        "event",
    ],
    "Language": [
        "de",
    ],
    "Type": [
        "_doc",
    ],
};
