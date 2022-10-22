// To parse this data:
//
//   import { Convert } from "./file";
//
//   const person = Convert.toPerson(json);
//
// These functions will throw an error if the JSON doesn't
// match the expected interface, even if the JSON is valid.

export interface Person {
    _index:    Index;
    _type:     Type;
    _id:       string;
    _score:    number;
    _source:   Source;
    _ignored?: Ignored[];
}

export enum Ignored {
    DescriptionsDescriptionKeyword = "descriptions.description.keyword",
}

export enum Index {
    Person = "person",
}

export interface Source {
    uid:           number;
    title:         string;
    slug:          string;
    score:         number;
    biography?:    any[] | BiographyClass;
    authorities?:  Authority[];
    categories:    Category[];
    descriptions?: Description[];
    genders?:      Category[];
    locations?:    SourceLocation[];
    names:         Name[];
    occupations?:  Occupation[];
    projects:      Project[];
    works?:        SourceWork[];
    events?:       Event[];
    performances?: SourcePerformance[];
    corporations?: Corporation[];
    serials?:      Serial[];
    sources?:      SourceElement[];
}

export interface Authority {
    authority: number;
}

export interface BiographyClass {
    birth?: Birth;
    death?: Birth;
}

export interface Birth {
    dates?:     DateElement[];
    locations?: BirthLocation[];
}

export interface DateElement {
    date: Date;
}

export interface BirthLocation {
    location: number;
}

export interface Category {
    label: number;
}

export interface Corporation {
    corporation: number;
}

export interface Description {
    description: string;
    language:    Language;
}

export enum Language {
    De = "de",
}

export interface Event {
    event:    number;
    mediums?: Occupation[];
}

export interface Occupation {
    subject: number;
}

export interface SourceLocation {
    location: number;
    label:    number;
}

export interface Name {
    name:  string;
    order: number;
}

export interface SourcePerformance {
    person: number;
    works:  PerformanceWork[];
}

export interface PerformanceWork {
    work:  number;
    count: number;
}

export interface Project {
    project: number;
}

export interface Serial {
    series:   number;
    mediums?: Occupation[];
}

export interface SourceElement {
    source: number;
}

export interface SourceWork {
    work:          number;
    performances?: WorkPerformance[];
}

export interface WorkPerformance {
    event: number;
}

export enum Type {
    Doc = "_doc",
}

// Converts JSON strings to/from your types
// and asserts the results of JSON.parse at runtime
export class Convert {
    public static toPerson(json: string): Person[] {
        return cast(JSON.parse(json), a(r("Person")));
    }

    public static personToJson(value: Person[]): string {
        return JSON.stringify(uncast(value, a(r("Person"))), null, 2);
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
    "Person": o([
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
        { json: "score", js: "score", typ: 0 },
        { json: "biography", js: "biography", typ: u(undefined, u(a("any"), r("BiographyClass"))) },
        { json: "authorities", js: "authorities", typ: u(undefined, a(r("Authority"))) },
        { json: "categories", js: "categories", typ: a(r("Category")) },
        { json: "descriptions", js: "descriptions", typ: u(undefined, a(r("Description"))) },
        { json: "genders", js: "genders", typ: u(undefined, a(r("Category"))) },
        { json: "locations", js: "locations", typ: u(undefined, a(r("SourceLocation"))) },
        { json: "names", js: "names", typ: a(r("Name")) },
        { json: "occupations", js: "occupations", typ: u(undefined, a(r("Occupation"))) },
        { json: "projects", js: "projects", typ: a(r("Project")) },
        { json: "works", js: "works", typ: u(undefined, a(r("SourceWork"))) },
        { json: "events", js: "events", typ: u(undefined, a(r("Event"))) },
        { json: "performances", js: "performances", typ: u(undefined, a(r("SourcePerformance"))) },
        { json: "corporations", js: "corporations", typ: u(undefined, a(r("Corporation"))) },
        { json: "serials", js: "serials", typ: u(undefined, a(r("Serial"))) },
        { json: "sources", js: "sources", typ: u(undefined, a(r("SourceElement"))) },
    ], false),
    "Authority": o([
        { json: "authority", js: "authority", typ: 0 },
    ], false),
    "BiographyClass": o([
        { json: "birth", js: "birth", typ: u(undefined, r("Birth")) },
        { json: "death", js: "death", typ: u(undefined, r("Birth")) },
    ], false),
    "Birth": o([
        { json: "dates", js: "dates", typ: u(undefined, a(r("DateElement"))) },
        { json: "locations", js: "locations", typ: u(undefined, a(r("BirthLocation"))) },
    ], false),
    "DateElement": o([
        { json: "date", js: "date", typ: Date },
    ], false),
    "BirthLocation": o([
        { json: "location", js: "location", typ: 0 },
    ], false),
    "Category": o([
        { json: "label", js: "label", typ: 0 },
    ], false),
    "Corporation": o([
        { json: "corporation", js: "corporation", typ: 0 },
    ], false),
    "Description": o([
        { json: "description", js: "description", typ: "" },
        { json: "language", js: "language", typ: r("Language") },
    ], false),
    "Event": o([
        { json: "event", js: "event", typ: 0 },
        { json: "mediums", js: "mediums", typ: u(undefined, a(r("Occupation"))) },
    ], false),
    "Occupation": o([
        { json: "subject", js: "subject", typ: 0 },
    ], false),
    "SourceLocation": o([
        { json: "location", js: "location", typ: 0 },
        { json: "label", js: "label", typ: 0 },
    ], false),
    "Name": o([
        { json: "name", js: "name", typ: "" },
        { json: "order", js: "order", typ: 0 },
    ], false),
    "SourcePerformance": o([
        { json: "person", js: "person", typ: 0 },
        { json: "works", js: "works", typ: a(r("PerformanceWork")) },
    ], false),
    "PerformanceWork": o([
        { json: "work", js: "work", typ: 0 },
        { json: "count", js: "count", typ: 0 },
    ], false),
    "Project": o([
        { json: "project", js: "project", typ: 0 },
    ], false),
    "Serial": o([
        { json: "series", js: "series", typ: 0 },
        { json: "mediums", js: "mediums", typ: u(undefined, a(r("Occupation"))) },
    ], false),
    "SourceElement": o([
        { json: "source", js: "source", typ: 0 },
    ], false),
    "SourceWork": o([
        { json: "work", js: "work", typ: 0 },
        { json: "performances", js: "performances", typ: u(undefined, a(r("WorkPerformance"))) },
    ], false),
    "WorkPerformance": o([
        { json: "event", js: "event", typ: 0 },
    ], false),
    "Ignored": [
        "descriptions.description.keyword",
    ],
    "Index": [
        "person",
    ],
    "Language": [
        "de",
    ],
    "Type": [
        "_doc",
    ],
};
