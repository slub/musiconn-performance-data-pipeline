// To parse this data:
//
//   import { Convert } from "./file";
//
//   const subject = Convert.toSubject(json);
//
// These functions will throw an error if the JSON doesn't
// match the expected interface, even if the JSON is valid.

export interface Subject {
    _index:    Index;
    _type:     Type;
    _id:       string;
    _score:    number;
    _source:   Source;
    _ignored?: string[];
}

export enum Index {
    Subject = "subject",
}

export interface Source {
    uid:           number;
    title:         string;
    slug:          string;
    score:         number;
    authorities?:  Authority[];
    categories:    Category[];
    names:         Name[];
    projects:      Project[];
    persons?:      Person[];
    parents?:      SourceParent[];
    performances?: Performance[];
    descriptions?: Description[];
    childs?:       SourceChild[];
    events?:       Event[];
    corporations?: Corporation[];
    serials?:      Serial[];
}

export interface Authority {
    authority: number;
}

export interface Category {
    label: number;
}

export interface SourceChild {
    subject: number;
    childs?: PurpleChild[];
}

export interface PurpleChild {
    subject: number;
    childs?: FluffyChild[];
}

export interface FluffyChild {
    subject: number;
    childs?: TentacledChild[];
}

export interface TentacledChild {
    subject: number;
    childs?: StickyChild[];
}

export interface StickyChild {
    subject: number;
    childs?: IndigoChild[];
}

export interface IndigoChild {
    subject: number;
    childs?: ParentElement[];
}

export interface ParentElement {
    subject: number;
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
    event: number;
}

export interface Name {
    name:     string;
    language: Language;
    order:    number;
}

export interface SourceParent {
    subject:  number;
    parents?: PurpleParent[];
}

export interface PurpleParent {
    subject:  number;
    parents?: FluffyParent[];
}

export interface FluffyParent {
    subject:  number;
    parents?: TentacledParent[];
}

export interface TentacledParent {
    subject:  number;
    parents?: StickyParent[];
}

export interface StickyParent {
    subject:  number;
    parents?: IndigoParent[];
}

export interface IndigoParent {
    subject:  number;
    parents?: ParentElement[];
}

export interface Performance {
    person: number;
    works:  Work[];
}

export interface Work {
    work:  number;
    count: number;
}

export interface Person {
    person: number;
}

export interface Project {
    project: number;
}

export interface Serial {
    series: number;
}

export enum Type {
    Doc = "_doc",
}

// Converts JSON strings to/from your types
// and asserts the results of JSON.parse at runtime
export class Convert {
    public static toSubject(json: string): Subject[] {
        return cast(JSON.parse(json), a(r("Subject")));
    }

    public static subjectToJson(value: Subject[]): string {
        return JSON.stringify(uncast(value, a(r("Subject"))), null, 2);
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
    "Subject": o([
        { json: "_index", js: "_index", typ: r("Index") },
        { json: "_type", js: "_type", typ: r("Type") },
        { json: "_id", js: "_id", typ: "" },
        { json: "_score", js: "_score", typ: 0 },
        { json: "_source", js: "_source", typ: r("Source") },
        { json: "_ignored", js: "_ignored", typ: u(undefined, a("")) },
    ], false),
    "Source": o([
        { json: "uid", js: "uid", typ: 0 },
        { json: "title", js: "title", typ: "" },
        { json: "slug", js: "slug", typ: "" },
        { json: "score", js: "score", typ: 0 },
        { json: "authorities", js: "authorities", typ: u(undefined, a(r("Authority"))) },
        { json: "categories", js: "categories", typ: a(r("Category")) },
        { json: "names", js: "names", typ: a(r("Name")) },
        { json: "projects", js: "projects", typ: a(r("Project")) },
        { json: "persons", js: "persons", typ: u(undefined, a(r("Person"))) },
        { json: "parents", js: "parents", typ: u(undefined, a(r("SourceParent"))) },
        { json: "performances", js: "performances", typ: u(undefined, a(r("Performance"))) },
        { json: "descriptions", js: "descriptions", typ: u(undefined, a(r("Description"))) },
        { json: "childs", js: "childs", typ: u(undefined, a(r("SourceChild"))) },
        { json: "events", js: "events", typ: u(undefined, a(r("Event"))) },
        { json: "corporations", js: "corporations", typ: u(undefined, a(r("Corporation"))) },
        { json: "serials", js: "serials", typ: u(undefined, a(r("Serial"))) },
    ], false),
    "Authority": o([
        { json: "authority", js: "authority", typ: 0 },
    ], false),
    "Category": o([
        { json: "label", js: "label", typ: 0 },
    ], false),
    "SourceChild": o([
        { json: "subject", js: "subject", typ: 0 },
        { json: "childs", js: "childs", typ: u(undefined, a(r("PurpleChild"))) },
    ], false),
    "PurpleChild": o([
        { json: "subject", js: "subject", typ: 0 },
        { json: "childs", js: "childs", typ: u(undefined, a(r("FluffyChild"))) },
    ], false),
    "FluffyChild": o([
        { json: "subject", js: "subject", typ: 0 },
        { json: "childs", js: "childs", typ: u(undefined, a(r("TentacledChild"))) },
    ], false),
    "TentacledChild": o([
        { json: "subject", js: "subject", typ: 0 },
        { json: "childs", js: "childs", typ: u(undefined, a(r("StickyChild"))) },
    ], false),
    "StickyChild": o([
        { json: "subject", js: "subject", typ: 0 },
        { json: "childs", js: "childs", typ: u(undefined, a(r("IndigoChild"))) },
    ], false),
    "IndigoChild": o([
        { json: "subject", js: "subject", typ: 0 },
        { json: "childs", js: "childs", typ: u(undefined, a(r("ParentElement"))) },
    ], false),
    "ParentElement": o([
        { json: "subject", js: "subject", typ: 0 },
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
    ], false),
    "Name": o([
        { json: "name", js: "name", typ: "" },
        { json: "language", js: "language", typ: r("Language") },
        { json: "order", js: "order", typ: 0 },
    ], false),
    "SourceParent": o([
        { json: "subject", js: "subject", typ: 0 },
        { json: "parents", js: "parents", typ: u(undefined, a(r("PurpleParent"))) },
    ], false),
    "PurpleParent": o([
        { json: "subject", js: "subject", typ: 0 },
        { json: "parents", js: "parents", typ: u(undefined, a(r("FluffyParent"))) },
    ], false),
    "FluffyParent": o([
        { json: "subject", js: "subject", typ: 0 },
        { json: "parents", js: "parents", typ: u(undefined, a(r("TentacledParent"))) },
    ], false),
    "TentacledParent": o([
        { json: "subject", js: "subject", typ: 0 },
        { json: "parents", js: "parents", typ: u(undefined, a(r("StickyParent"))) },
    ], false),
    "StickyParent": o([
        { json: "subject", js: "subject", typ: 0 },
        { json: "parents", js: "parents", typ: u(undefined, a(r("IndigoParent"))) },
    ], false),
    "IndigoParent": o([
        { json: "subject", js: "subject", typ: 0 },
        { json: "parents", js: "parents", typ: u(undefined, a(r("ParentElement"))) },
    ], false),
    "Performance": o([
        { json: "person", js: "person", typ: 0 },
        { json: "works", js: "works", typ: a(r("Work")) },
    ], false),
    "Work": o([
        { json: "work", js: "work", typ: 0 },
        { json: "count", js: "count", typ: 0 },
    ], false),
    "Person": o([
        { json: "person", js: "person", typ: 0 },
    ], false),
    "Project": o([
        { json: "project", js: "project", typ: 0 },
    ], false),
    "Serial": o([
        { json: "series", js: "series", typ: 0 },
    ], false),
    "Index": [
        "subject",
    ],
    "Language": [
        "de",
    ],
    "Type": [
        "_doc",
    ],
};
