#!/bin/bash
cd /home/container

echo "Container startup..."

MODIFIED_STARTUP=$(eval echo $(echo ${STARTUP} | sed -e 's/{{/${/g' -e 's/}}/}/g'))

echo "/home/container$ ${MODIFIED_STARTUP}"

exec ${MODIFIED_STARTUP}