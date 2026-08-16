# Docker Setup

Make sure that you have a reverse proxy setup for your chat instance!

```bash
# download compose file
wget https://raw.githubusercontent.com/hackthedev/dcts-shipping/refs/heads/main/Docker/docker-compose.yml  

# launch it
docker compose up
```

or alternatively:

# You can choose between these tags  

```bash
sudo docker pull ghcr.io/hackthedev/dcts-shipping:latest # :latest, :main or :beta  
sudo docker run --rm -p 2052:2052 ghcr.io/hackthedev/dcts-shipping:latest # :latest, :main or :beta
```

#### Accessing the server

- Open your browser and go to `http://localhost:2052` (or your server's IP).
    
- If you just want to try DCTS, you can visit the public instance at [https://chat.network-z.com/](https://chat.network-z.com/).
    

> [!IMPORTANT]
> Docker was made possible thanks to people like **panda**, **Reeperk**, **Animo**. and **Luna/wunadacat**.