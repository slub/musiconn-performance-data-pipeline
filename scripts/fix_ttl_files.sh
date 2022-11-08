#!/usr/bin/env bash

INPUT_DIR=$1
OUTPUT_DIR=$2

for file in `ls ${INPUT_DIR}/*.ttl`;do
  rapper -i turtle -o turtle ${file} > "${OUTPUT_DIR}/`basename ${file}`"
done
