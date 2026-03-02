#!/bin/bash
name="${1:-dcts}"
if [[ -z "$name" ]]; then
  echo "Couldnt start dcts as no screen session name was supplied"
  validArgs=0
fi

cd /home/dcts && screen -dmSL "$name" bun /home/dcts
