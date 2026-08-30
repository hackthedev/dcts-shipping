#!/bin/bash
set -e

sudo docker compose down
sudo docker compose build --no-cache
sudo docker compose up -d
sudo docker compose logs -f

# These are here on purpose because i will 100% forget these commands again.
#
# sudo docker exec -it docker-dcts-app-1 bash
# sudo docker restart docker-dcts-app-1