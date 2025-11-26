#!/bin/bash
name="$1"
cd /home/dcts && screen -dmSL "$name" node /home/dcts
