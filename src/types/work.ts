// To parse this data:
//
//   import { Convert } from "./file";
//
//   const work = Convert.toWork(json);
//
// These functions will throw an error if the JSON doesn't
// match the expected interface, even if the JSON is valid.

export interface Work {
    _index:    IndexEnum;
    _type:     Type;
    _id:       string;
    _score:    number;
    _source:   Source;
    _ignored?: Ignored[];
}

export enum Ignored {
    DescriptionsDescriptionKeyword = "descriptions.description.keyword",
    SlugKeyword = "slug.keyword",
    TitleKeyword = "title.keyword",
}

export enum IndexEnum {
    Work = "work",
}

export interface Source {
    uid:           number;
    title:         string;
    slug:          string;
    score:         number;
    categories:    Category[];
    descriptions?: Description[];
    genres?:       Genre[];
    mediums?:      Medium[];
    names:         Name[];
    composers?:    Composer[];
    projects?:     Project[];
    events?:       Event[];
    corporations?: Corporation[];
    persons?:      Person[];
    locations?:    Location[];
    authorities?:  Authority[];
    dates?:        DateElement[];
    indexes?:      Index[];
    childs?:       SourceChild[];
    parents?:      SourceParent[];
    libretists?:   Composer[];
}

export interface Authority {
    authority: number;
}

export interface Category {
    label: number;
}

export interface SourceChild {
    work:    number;
    childs?: PurpleChild[];
}

export interface PurpleChild {
    work:    number;
    childs?: ParentElement[];
}

export interface ParentElement {
    work: number;
}

export interface Composer {
    person: number;
}

export interface Corporation {
    corporation: number;
    count:       number;
}

export interface DateElement {
    date:  number | string;
    label: number;
}

export interface Description {
    description: number | string;
    language:    Language;
}

export enum Language {
    De = "de",
}

export interface Event {
    event: number;
}

export interface Genre {
    subject: number;
}

export interface Index {
    index: number | string;
    label: number;
}

export interface Location {
    location: number;
    count:    number;
}

export interface Medium {
    subject:   number;
    quantity?: number;
}

export interface Name {
    name?:    number | string;
    language: Language;
    order:    number;
}

export interface SourceParent {
    work:     number;
    parents?: ParentParent[];
}

export interface ParentParent {
    work:     number;
    parents?: ParentElement[];
}

export interface Person {
    person: number;
    count:  number;
}

export interface Project {
    project: number;
}

export enum Type {
    Doc = "_doc",
}

// Converts JSON strings to/from your types
// and asserts the results of JSON.parse at runtime
export class Convert {
    public static toWork(json: string): Work[] {
        return cast(JSON.parse(json), a(r("Work")));
    }

    public static workToJson(value: Work[]): string {
        return JSON.stringify(uncast(value, a(r("Work"))), null, 2);
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
    "Work": o([
        { json: "_index", js: "_index", typ: r("IndexEnum") },
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
        { json: "categories", js: "categories", typ: a(r("Category")) },
        { json: "descriptions", js: "descriptions", typ: u(undefined, a(r("Description"))) },
        { json: "genres", js: "genres", typ: u(undefined, a(r("Genre"))) },
        { json: "mediums", js: "mediums", typ: u(undefined, a(r("Medium"))) },
        { json: "names", js: "names", typ: a(r("Name")) },
        { json: "composers", js: "composers", typ: u(undefined, a(r("Composer"))) },
        { json: "projects", js: "projects", typ: u(undefined, a(r("Project"))) },
        { json: "events", js: "events", typ: u(undefined, a(r("Event"))) },
        { json: "corporations", js: "corporations", typ: u(undefined, a(r("Corporation"))) },
        { json: "persons", js: "persons", typ: u(undefined, a(r("Person"))) },
        { json: "locations", js: "locations", typ: u(undefined, a(r("Location"))) },
        { json: "authorities", js: "authorities", typ: u(undefined, a(r("Authority"))) },
        { json: "dates", js: "dates", typ: u(undefined, a(r("DateElement"))) },
        { json: "indexes", js: "indexes", typ: u(undefined, a(r("Index"))) },
        { json: "childs", js: "childs", typ: u(undefined, a(r("SourceChild"))) },
        { json: "parents", js: "parents", typ: u(undefined, a(r("SourceParent"))) },
        { json: "libretists", js: "libretists", typ: u(undefined, a(r("Composer"))) },
    ], false),
    "Authority": o([
        { json: "authority", js: "authority", typ: 0 },
    ], false),
    "Category": o([
        { json: "label", js: "label", typ: 0 },
    ], false),
    "SourceChild": o([
        { json: "work", js: "work", typ: 0 },
        { json: "childs", js: "childs", typ: u(undefined, a(r("PurpleChild"))) },
    ], false),
    "PurpleChild": o([
        { json: "work", js: "work", typ: 0 },
        { json: "childs", js: "childs", typ: u(undefined, a(r("ParentElement"))) },
    ], false),
    "ParentElement": o([
        { json: "work", js: "work", typ: 0 },
    ], false),
    "Composer": o([
        { json: "person", js: "person", typ: 0 },
    ], false),
    "Corporation": o([
        { json: "corporation", js: "corporation", typ: 0 },
        { json: "count", js: "count", typ: 0 },
    ], false),
    "DateElement": o([
        { json: "date", js: "date", typ: u(0, "") },
        { json: "label", js: "label", typ: 0 },
    ], false),
    "Description": o([
        { json: "description", js: "description", typ: u(0, "") },
        { json: "language", js: "language", typ: r("Language") },
    ], false),
    "Event": o([
        { json: "event", js: "event", typ: 0 },
    ], false),
    "Genre": o([
        { json: "subject", js: "subject", typ: 0 },
    ], false),
    "Index": o([
        { json: "index", js: "index", typ: u(0, "") },
        { json: "label", js: "label", typ: 0 },
    ], false),
    "Location": o([
        { json: "location", js: "location", typ: 0 },
        { json: "count", js: "count", typ: 0 },
    ], false),
    "Medium": o([
        { json: "subject", js: "subject", typ: 0 },
        { json: "quantity", js: "quantity", typ: u(undefined, 0) },
    ], false),
    "Name": o([
        { json: "name", js: "name", typ: u(undefined, u(0, "")) },
        { json: "language", js: "language", typ: r("Language") },
        { json: "order", js: "order", typ: 0 },
    ], false),
    "SourceParent": o([
        { json: "work", js: "work", typ: 0 },
        { json: "parents", js: "parents", typ: u(undefined, a(r("ParentParent"))) },
    ], false),
    "ParentParent": o([
        { json: "work", js: "work", typ: 0 },
        { json: "parents", js: "parents", typ: u(undefined, a(r("ParentElement"))) },
    ], false),
    "Person": o([
        { json: "person", js: "person", typ: 0 },
        { json: "count", js: "count", typ: 0 },
    ], false),
    "Project": o([
        { json: "project", js: "project", typ: 0 },
    ], false),
    "Ignored": [
        "descriptions.description.keyword",
        "slug.keyword",
        "title.keyword",
    ],
    "IndexEnum": [
        "work",
    ],
    "Language": [
        "de",
    ],
    "Type": [
        "_doc",
    ],
};
