musiconn.performance - schemata
===

This is a collection of schemata for the Musiconn.performance catalog project.
Its purpose is to provide a common vocabulary for describing
musical performances. It can be bootstraped from the elastic search
index of the Musiconn.perfomance database (as of 2022).

## Data processing pipeline


Assumes elasticsearch to be running on `localhost:9200`.

1. get all indices

```shell
curl http://localhost:9200/_cat/indices?h=i | grep -v "\."
```
2. create a dump of all indices

```shell
cd data
INDICES=(date subject work corporation source series person authority location event )
for INDEX in "${INDICES[@]}";do 
  npx elasticdump --input=http://localhost:9200/${INDEX} --output=${INDEX}_data.json --type=data
done
```

3.  optionally slurp json stream and make it valid json

```shell
cd data
cat ./${INDEX}_data.json | jq -s '.' > ${INDEX}_data_pretty.json
```

## Datatypes and Schemata

Types can automatically be inferred from the data dumps, so that
changes in the data model will cause the data pipeline to fail,
once the data model drifts away from the schemata.

To learn json-schemata from the data

```shell
npm run build:jsonSchemas
```

To generate typescript types from json-schema

```shell
npm run build:types
```

## RDF data generation

6. generate rdf graph from the dumped data

 ```shell
 npm run build:graph
 ```

## Data Pipeline

The stream processor takes the json data dump transforms them into RDF as intermediate
format and creates Cypher statements, that can be streamed directly to a neo4j database.

you could stream it to a neo4j instance

```shell
npm run build:neo4j
```