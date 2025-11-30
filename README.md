# DCTS - Direct Communication Through Sockets
[Visit our subreddit](https://www.reddit.com/r/dcts/) • [Feature list](https://github.com/hackthedev/dcts-shipping/blob/beta/docs/Feature%20List.md) • [Discord for convenience](https://discord.gg/AYq8hbRHNR) • [Public Instance](https://chat.network-z.com/) • [To-Do list](https://github.com/users/hackthedev/projects/6/views/1?filterQuery=-changelog-status%3AAdded+-status%3ACanceled)

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/M4M719FPNG) 

This project was made with the goal to provide a platform that aims to fix issues with existing solutions like Discord, TeamSpeak, Revolt, Fosscord, Matrix, TeaSpeak and all others out there and to create new, advanced and easy to use features while creating as little friction as possible and keeping things intuitive.

Although there are still some rough edges and a few missing features, DCTS is evolving rapidly due to the massive amount of work being put into its development. This includes adding new features as well as refining existing ones or improving the general experience. Compared to other alternatives, DCTS is evolving lightning fast.

**If you need help** or wanna reach out to me feel free to create a **post on** the **subreddit**, **message** me **on discord**, or text me **on signal: shydevil.89**.

![image-20251127214420083](./assets/image-20251127214420083.png)

![image-20251127214237435](./assets/image-20251127214237435.png)

*(^ this is a custom theme thats shipped too)*

------

## Support the Project <3

Without community support, development may slow down significantly and could even come to a halt over time :(

If you value the vision of DCTS and want to see it grow, consider making a donation. Every contribution helps accelerate development and ensures the project's future. Thank you for helping to keep DCTS alive!

[Donate via PayPal](https://www.paypal.me/devilsstore) | [Donate via Ko-fi](https://ko-fi.com/shydevil)

> [!TIP]
>
> You can also **support the project by** regularly **sharing it and letting** as many **people know**  about it as possible!

------

## Why DCTS?

> [!NOTE]
> DCTS is still in development. Some features may not yet be fully refined.

Modern communication platforms have limitations and issues that DCTS is designed to overcome and fix. Here's why DCTS exists and how it stands out:

- **Encrypted DMs**: DMs are end-to-end encrypted when using the [desktop client](https://github.com/hackthedev/dcts-client-shipping/) and non-encrypted when using the web app as fallback. Despite encryption its possible to report and moderate encrypted messages without compromise![^1]

- **Decentralized In-App Server Discovery**: When using the desktop client, users will share their previously connected servers with the currently connected servers. Servers will sync with other servers and display them seamlessly for both the web and desktop client.

- **Full Data Control**: Self-host your server and take complete control of your data and privacy with ease.

- **Easy to Set Up**: With just two commands (assuming NodeJS & MySQL/MariaDB are installed), you can have your server running.

- **Community-Driven**: Responsive development ensures your feedback and feature requests are heard.

- **Modern and User-Friendly**: Combines a sleek design with an intuitive interface for both casual and advanced users.

- **Highly Customizable**: The plugin system allows endless possibilities for enhancements and features, developed by the community or officially **without** the need of additional hosting.

- **Efficient Media Handling**: Supports advanced features like a Cloudflare image CDN for fast and smooth media uploads and media cache.

- **No Paywalls**: Enjoy full functionality without subscriptions or hidden costs - DCTS is made for everyone.

- **User-Focused**: Designed to prioritize users, not corporations.

- **Future-Proof**: Built with scalability and future features in mind.

- **Rapid Development**: Fast bug resolution, continuous feature delivery, and ongoing improvements enabled by a modern and efficient tech stack.

- **Custom Themes**: You can select custom themes the server has to offer, two example themes included on default and with accent color support.

- **Account Export**: You can export your account and easily re-import it when needed.

While DCTS is an app, its going to be part of a bigger ecosystem that i plan to create in order to make the web a better place because we still need proper alternatives in other areas too.

> [!TIP]
>
> Checkout the Feature list in `/docs/Feature List.md` if you're curious about more

------

## Installing
### Docker

# DCTS Shipping - Docker Installation

## 🚀 Prerequisites

- Docker installed and running.
- Docker Compose (recommended for multi-service setup).
- (Optional) A reverse proxy (e.g., Godoxy (❤️), Caddy, Traefik or Nginx) if you plan to expose DCTS via a domain with HTTPS.
- A MySQL-compatible database (e.g., MariaDB) is required for DCTS.
- LiveKit is required for voice chat and streaming features.

## 🧱 Installation using Docker Compose (recommended)

1. Create a `docker-compose.yml` file with the following content:

```yaml
services:
  dcts-app:
    image: dcts:latest
    depends_on:
      - dcts-mariadb
      - dcts-livekit
    environment:
      - DB_HOST=dcts-mariadb
      - DB_USER=dcts
      - DB_PASS=dcts
      - DB_NAME=dcts
      - LIVEKIT_URL=your_proxied_url # e.g., livekit.example.com
      - LIVEKIT_KEY=change_me
      - LIVEKIT_SECRET=change_me
      - DEBUG=false # optional
    restart: unless-stopped
    ports:
      - 2052:2052
    volumes:
      - ./dcts/sv:/app/sv
      - ./dcts/configs:/app/configs
      - ./dcts/uploads:/app/public/uploads
      - ./dcts/emojis:/app/public/emojis
      - ./dcts/plugins:/app/plugins

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

## 📌 Ports Used by Each Service 

| Service      | Ports              | Notes                                                        |
| ------------ | ------------------ | ------------------------------------------------------------ |
| dcts-app     | 2052               | Must be reverse proxied if using a domain                    |
| dcts-mariadb | 3306               | Internal MySQL port, no need to expose externally            |
| dcts-redis   | 6379               | Internal Redis port, no need to expose externally            |
| dcts-livekit | 7880               | LiveKit API/WebSocket, must be reverse proxied               |
|              | 7881               | ICE/TCP signaling, expose directly; used when UDP is blocked |
|              | 7882/udp           | ICE/UDP Mux, minimal setup for WebRTC, expose directly       |
|              | 3478/udp, 5349/tcp | Optional TURN server ports, expose directly if TURN enabled  |

## 🐳 Alternative method: Docker Run (quick test)

If you want to quickly test DCTS without Compose:

```bash
sudo docker run --name dcts-server -p 2052:2052 ghcr.io/hackthedev/dcts-shipping
```

**Important:** DCTS will not work without a MySQL-compatible database.

- Container port 2052 will be mapped to port 2052 on your machine.
- Access it at `http://localhost:2052`.
- If you just want to try DCTS, you can visit the public instance at [https://chat.network-z.com/](https://chat.network-z.com/).

## 🌐 Accessing the server

- Open your browser and go to `http://localhost:2052` (or your server's IP).

## 📝 Tips & best practices

- Use Docker volumes for persistent data (uploads, media, plugins, configs).
- Configure environment variables, HTTPS/TLS, backups, and logs for production use.



### Installer Script

In order to make the install experience as easy as possible i've tried to make a complete auto installer script that installs and configurates everything thats needed to run an instance.

##### Tested with

- Debian 13

> [!CAUTION]
>
> The installer script is designed to be used on a new system. It uses caddy and will completely replace the caddy config file in `/etc/caddy/` the first time it runs. Once docker is available i recommend using that.

> [!NOTE]
>
> If you want to manually install DCTS checkout the `docs` folder, specifically `Getting started` and `VoIP Setup`.

> [!IMPORTANT]
>
> You will need to setup your domain DNS records first! Example records:
>
> - Chat » chat.your-domain.com
> - Voip » lk.chat.your-domain.com

```bash
# Auto Installer Script that installs and configurates EVERYTHING 
apt install curl -y && curl -sSL https://raw.githubusercontent.com/hackthedev/initra-shipping/refs/heads/main/apps/dcts/install.sh | bash -s -- --create-instance "Test Server 1" --port 2000 --domain chat.your-domain.com --beta
```

Once **successfully** executed, your instance should be available at `chat.your-domain.com:2000` with working voice chat and **everything**. you can access the server console with `screen -x dcts_testserver1` with this example.

------

## Tested Node Versions
- ✔️ v21.7.3
- ✔️ v20.19.2
- ✔️ v18.20.2
- ✔️ v16.16.0
- 🚫 v12.22.9

[^1]: When user A sends user B a message, only user A and B can decrypt the message. When user B reports the message sent by user A, user B creates a report with the encrypted data and decrypted message. Based on the decrypted plain text from user B and public key from user A, its possible to verify the encrypted data by any third party, tho only user A and B can actually decrypt it.
