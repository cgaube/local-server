#!/bin/bash
set -e

directory=${1:-""}

if [[ -d "$directory" ]]; then
  dirs=$(find "$directory" -maxdepth 1 -mindepth 1 -type f -name "*.zip" -exec "basename" {} \;)
  files=(${dirs///,/ })
  csv=$(IFS=,; echo "${files[*]}")
  echo "{\"functions\": \"$csv\"}"
else
  echo '{}'
fi
