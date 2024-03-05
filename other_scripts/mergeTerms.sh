#!/bin/bash

if [ "$#" -lt 1 ]; then
    echo "Usage: $0 output_file.json input_file1.json input_file2.json [input_file3.json ...]"
    exit 1
fi

# Extract the first argument as the output file
output_file="$1"
shift

# Merge JSON files using jq
jq -s 'flatten' "$@" > "$output_file"

jq '[.[] | .data] | flatten' "$output_file" > "tmp"
jq  'unique_by(.courseTitle)' "tmp" > "$output_file"
rm tmp
