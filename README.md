musiconn.performance - schemata
===

This is a collection of schemata for the MusicConn project.
Its purpose is to provide a common vocabulary for describing
musical performances. It can be bootstraped from the elastic search
index of the MusicConn.perfomance project.

## Data processing pipeline

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

3.  slurp json stream and make it valid json

```shell
cd data
cat ./${INDEX}_data.json | jq -s '.' > ${INDEX}_data_pretty.json
```

4. learn json-schema from data

```shell
npm run build:jsonSchemas
```

5. generate typescript types from json-schema

```shell
npm run build:types
```

6. generate rdf graph from slurped data

 ```shell
 npm run build:graph
 ```