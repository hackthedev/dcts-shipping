#!/bin/bash
#echo "Starting DCTS Check Script"

sleep 4
if ! screen -list | grep -q "dctsdiscover"; then
    echo "is not running"
    sh /home/dcts/discover/sv/start.sh
fi