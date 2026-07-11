# Ptero Node Setup Notes

When setting up a node server there are some tricky things to keep in mind.

- The mariadb server's bind-address needs to be set to 0.0.0.0
- A database host's ip needs to be 127.0.0.1 if on the same host.
- A db user needs to exist for %, localhost and 127.0.0.1
- Mounts are NOT needed as it seems
- Email ports like 587 will need to be enabled by the hosting provider and reinstalling a node may requires getting the port re-enabled.
- `post_max_size`, `upload_max_filesize` and related 
- PHP config can be found using `php --ini`
- Instance proxy needs to be created for the wildcard domain to work.
- Certs can be fetched with `certbot certonly --standalone -d hosting.dcts.community`, wildcards with `certbot certonly --manual --preferred-challenges dns -d instance.dcts.community -d *.instance.dcts.community`.
- Mail port can be checked with `openssl s_client -connect mail.dcts.community:587`.
- Ports can be checked with `ss -tulpn | grep 3306` on the local machine.


---


## Instance proxy

```nginx
server {
    listen 80;
    server_name ~^(?<port>[0-9]+)\.instance\.dcts\.community$;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    http2 on;
    server_name ~^(?<port>[0-9]+)\.instance\.dcts\.community$;

    ssl_certificate /etc/letsencrypt/live/instance.dcts.community/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/instance.dcts.community/privkey.pem;

    location / {
        proxy_pass http://your.public.ip:$port;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}
```