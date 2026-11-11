#!/bin/bash

SERVER="root@docs.dcts.community"
REMOTE_DIR="/var/www/vhosts/dcts.community/docs.dcts.community"
LOCAL_DIR="docs/.vitepress/dist/"

scp -r "$LOCAL_DIR/." "$SERVER:$REMOTE_DIR/"
