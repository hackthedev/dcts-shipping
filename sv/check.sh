#!/bin/bash
#echo "Starting DCTS Check Script"
name="$1"
if [[ -z "$name" ]]; then
  echo "Couldnt check dcts as no screen session name was supplied"
  validArgs=0
fi

if ! screen -list | grep -q "$name"; then
    echo "is not running"
    bash /home/dcts/sv/start.sh "$name"
fi