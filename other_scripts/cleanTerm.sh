#!/bin/sh
if [ -z "$1" ]; then
    echo "Usage: $0 <term.json>"
    exit 1
fi

jq '[.[] | .data] | flatten' "$1" > "tmp"
jq  'unique_by(.courseTitle)' "tmp" > "$1"
rm tmp
