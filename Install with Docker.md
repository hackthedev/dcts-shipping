## DCTS Shipping - Docker Installation

### ⚡ Quick Start

If you want to get started quickly, you can use an interactive setup script to automatically create the Docker Compose setup: [soon]

### 🚀 Prerequisites

- Docker installed and running.
- Docker Compose (recommended for multi-service setup).
- (Optional) A reverse proxy (e.g., Godoxy (❤️), Caddy, Traefik or Nginx) if you plan to expose DCTS via a domain with HTTPS.
- A MySQL-compatible database (e.g., MariaDB) is required for DCTS.
- LiveKit is required for voice chat and streaming features.

### 🧱 Installation using Docker Compose (recommended)

1. Create a `docker-compose.yml` file with the following content:

```yaml
services:
  dcts-app:
    image: ghcr.io/hackthedev/dcts-shipping:latest
    depends_on:
      - dcts-mariadb
      - dcts-livekit
    environment:
      - DB_HOST=dcts-mariadb
      - DB_USER=dcts
      - DB_PASS=dcts
      - DB_NAME=dcts
      - LIVEKIT_URL=your_proxied_url # e.g., livekit.example.com or localhost:7880
      - LIVEKIT_KEY=change_me
      - LIVEKIT_SECRET=change_me
      - DEBUG=false # optional
    restart: unless-stopped
    ports:
      - 2052:2052
# persistent volumes not working for now
#    volumes:
#      - ./dcts/sv:/app/sv
#      - ./dcts/configs:/app/configs
#      - ./dcts/uploads:/app/public/uploads
#      - ./dcts/emojis:/app/public/emojis
#      - ./dcts/plugins:/app/plugins

  dcts-mariadb:
    image: mariadb:latest
    environment:
      - MARIADB_RANDOM_ROOT_PASSWORD=1
      - MARIADB_DATABASE=dcts
      - MARIADB_USER=dcts
      - MARIADB_PASSWORD=dcts
    volumes:
      - dcts-mariadb-data:/var/lib/mysql

  dcts-redis:
    image: redis:alpine
    volumes:
      - dcts-redis-data:/data

  dcts-livekit:
    image: livekit/livekit-server:latest
    command: --config /etc/livekit.yaml
    volumes:
      - dcts-livekit-config:/etc/livekit.yaml
    ports:
      - 7880:7880 # LiveKit API/WebSocket, must be reverse proxied
      - 7881:7881 # ICE/TCP signaling, expose directly
      - 7882:7882/udp # ICE/UDP mux, expose directly
      # Optional TURN ports
      - 3478:3478/udp
      - 5349:5349/tcp

volumes:
  dcts-mariadb-data:
  dcts-redis-data:
  dcts-livekit-config:
```

2. Create a `livekit.yaml` file with the following content:

```yaml
port: 7880
rtc:
    tcp_port: 7881
    udp_port: 7882
    use_external_ip: true
    enable_loopback_candidate: false
redis:
    address: dcts-redis:6379
    username: ""
    password: ""
    db: 0
    use_tls: false
turn:
    enabled: false
    domain: your_turn_domain_if_enabled # e.g., turn.example.com
    tls_port: 5349
    udp_port: 3478
    external_tls: true
keys:
    change_me: change_me
```

3. Generate a `LIVEKIT_KEY` and `LIVEKIT_SECRET` with the following command:

```bash
openssl rand -hex 16
```

4. Start the services:

```bash
sudo docker compose up -d
```

- Access the application at `http://localhost:2052` (or your server's IP address).
- You can view the logs in real time using:

```bash
docker compose logs -f
```

### 📌 Ports Used by Each Service

| Service      | Ports              | Notes                                                        |
| ------------ | ------------------ | ------------------------------------------------------------ |
| dcts-app     | 2052               | Must be reverse proxied if using a domain                    |
| dcts-mariadb | 3306               | Internal MySQL port, no need to expose externally            |
| dcts-redis   | 6379               | Internal Redis port, no need to expose externally            |
| dcts-livekit | 7880               | LiveKit API/WebSocket, must be reverse proxied               |
|              | 7881               | ICE/TCP signaling, expose directly; used when UDP is blocked |
|              | 7882/udp           | ICE/UDP Mux, minimal setup for WebRTC, expose directly       |
|              | 3478/udp, 5349/tcp | Optional TURN server ports, expose directly if TURN enabled  |

### 🐳 Alternative method: Docker Run (quick test)

If you want to quickly test DCTS without Compose:

```bash
sudo docker run --name dcts-server -p 2052:2052 ghcr.io/hackthedev/dcts-shipping:latest
```

**Important:** DCTS will not work without a MySQL-compatible database.

- Container port 2052 will be mapped to port 2052 on your machine.
- Access it at `http://localhost:2052`.
- If you just want to try DCTS, you can visit the public instance at [https://chat.network-z.com/](https://chat.network-z.com/).

### 🌐 Accessing the server

- Open your browser and go to `http://localhost:2052` (or your server's IP/URL).

### 🏗 Building the DCTS Docker Image Yourself

If you want to build the DCTS image locally instead of using the prebuilt `ghcr.io/hackthedev/dcts-shipping:latest` image:

1. Clone the DCTS repository:

```bash
git clone https://github.com/hackthedev/dcts-shipping.git
cd dcts-shipping
```

2. Build the Docker image:

```bash
docker build -t dcts:latest .
```

3. Once built, you can use this local image in your `docker-compose.yml` by replacing `ghcr.io/hackthedev/dcts-shipping:latest` with `dcts:latest`.
