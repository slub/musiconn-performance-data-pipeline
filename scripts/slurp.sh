#!/usr/bin/env bash

INDICES=(date subject work corporation source series person authority location event )
for INDEX in "${INDICES[@]}";do
  cat ./${INDEX}_data.json | jq -s '.' > ${INDEX}_data_pretty.json
done
