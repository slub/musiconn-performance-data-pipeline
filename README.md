musiconn.performance - schemata
===

This is a collection of schemata for the [Musiconn Performance](https://performance.musiconn.de/) catalog project.
Its purpose is to provide a common vocabulary for describing
musical performances. It can be bootstraped from the elastic search
index of the Musiconn.perfomance database (as of november 2022).

## Dumping the database

Assumes elasticsearch to be running on `localhost:9200`.

If you want to use localhost for a remote ES instance, you need to
set up a tunnel to the remote host:

    ssh user@example.de -L 9200:localhost:9200 -N

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

## Dataprocessing Pipeline

The stream processor takes the json data dump transforms them into RDF as intermediate
format and creates Cypher statements, that can be streamed directly to a neo4j database.

you could stream it to a neo4j instance

```shell
npm run build:neo4j
```

## reproducable build environment using nix

### on Linux ans MacOSX with nix installed

on any system, where the nix package manager is installed with experimental flake support
turned on, you can just run

```shell
nix develop
```

### other OSs and Linux without nix installed

you can use a docker image containing the nix package manager to build the project
or get a development environment with all dependencies installed.

```shell
docker run  -v /var/run/docker.sock:/var/run/docker.sock \
            -v "$(pwd):/app" \
            -it -w /app --rm \
            nixos/nix \
            bash -c "nix develop -L --extra-experimental-features nix-command --extra-experimental-features flakes --no-sandbox"
```