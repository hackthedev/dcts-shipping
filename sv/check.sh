#!/bin/bash
#echo "Starting DCTS Check Script"

sleep 4
if ! screen -list | grep -q "dcts"; then
    echo "is not running"
    sh /home/dcts/start.sh
fi