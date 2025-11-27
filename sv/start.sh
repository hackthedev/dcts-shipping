#!/bin/bash
name="$(openssl rand -hex 8)"
cd /home/dcts && screen -dmSL "$name" node /home/dcts
