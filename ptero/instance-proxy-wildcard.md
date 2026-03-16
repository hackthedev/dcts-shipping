# Instance Proxy for Ptero

Used for *.instance.dcts.community. ggs

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
        proxy_pass http://5.231.74.46:$port;
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

