#!/usr/bin/env bash

INDEX_BUILDER=$1
INPUT_DIR=$2
DATA_DIR=$3
DATABASE=musiconn

if [ ! -d "${DATA_DIR}" ]; then
  echo "First run, creating data directory..."
  mkdir -p ${DATA_DIR}
  if [ ! -e "${DATA_DIR}/${DATABASE}.settings.json" ]; then
    echo "First run, creating database settings..."
    cat <<EOF > ${DATA_DIR}/${DATABASE}.settings.json
{
  "ascii-prefixes-only": true,
  "num-triples-per-batch": 50000000
}
EOF
  fi
fi

for file in `ls ${INPUT_DIR}/*.ttl`;do
  echo ${file}
   ${INDEX_BUILDER} -f ${file} -i ${DATABASE} -s ${DATA_DIR}/${DATABASE}.settings.json
done
