# Reverse Proxy Setup

This document will explain how to use the chat software and setup a reverse proxy. This will result in the url being https://app.your-domain.com instead of https://your-domain.com:2052/ [^portnote] , depending on the subdomain you choose or how you've setup your reverse proxy.

> [!TIP]
>
> Its recommended to use a reverse proxy as you wont have to manually deal with cert files inside the `config.json` file if your domain already uses a letsencrypt certificate. 
> 
> Generally its recommended to use caddy. Instructions for caddy can be found in [Caddy Setup](Caddy%20Setup.md).

------

## Chat
### nginx Setup

The following configuration is an example on how you can use the chat app using the reverse proxy. It will change the address from https://you-domain.com:2052 to https://app.your-domain.com. 

```nginx
location / {
	proxy_pass http://127.0.0.1:2052/;
	proxy_http_version 1.1;

	proxy_set_header Upgrade $http_upgrade;
	proxy_set_header Connection "upgrade";
	proxy_set_header Host $host;
	proxy_set_header X-Real-IP $remote_addr;
	proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
	proxy_set_header X-Forwarded-Proto $scheme;
}

location /socket.io/ {
	proxy_pass http://127.0.0.1:2052;
	proxy_http_version 1.1;

	proxy_set_header Upgrade $http_upgrade;
	proxy_set_header Connection "upgrade";

	proxy_set_header Host $host;
	proxy_set_header X-Real-IP $remote_addr;
	proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
	proxy_set_header X-Forwarded-Proto $scheme;
}
```

------

### caddy Setup

Caddy may be simpler to use and already takes care of SSL (TLS) as well and may be preferred. Personally i would recommend it to anyone thats new to it or isnt running nginx already.

```nginx
# DCTS-$domain
chat.your-domain.com {
    reverse_proxy 127.0.0.1:2052 # or localhost instead of 127.0.0.1
}
```


---

## VC & Screenshare Proxies

Voice chatting as well as screensharing etc has their own reverse proxy. These are all examples but should work.
### nginx

```nginx
location / {
	proxy_pass http://127.0.0.1:7880/;
	proxy_http_version 1.1;

	add_header Access-Control-Allow-Origin *;
	add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
	add_header Access-Control-Allow-Headers "*";

	proxy_set_header Upgrade $http_upgrade;
	proxy_set_header Connection "upgrade";
	proxy_set_header Host $host;
	proxy_set_header X-Real-IP $remote_addr;
	proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
	proxy_set_header X-Forwarded-Proto $scheme;
}
```

### caddy
```nginx
lk.your-domain.com {
    reverse_proxy localhost:7880 {
        transport http {
            versions 1.1
        }
    }

    header {
        Access-Control-Allow-Origin *
        Access-Control-Allow-Methods "GET, POST, OPTIONS"
        Access-Control-Allow-Headers *
        Access-Control-Allow-Credentials true
    }
}
```


---

## Some helpful tips

- You can check if your ports are publicly available with tools like https://canyouseeme.org/
- If you run nginx and caddy you will run into possible conflicts. Use either one, not both.
- When using caddy make sure it always runs as it will handle the reverse proxy
- If you're new and want a more simpler experience, i would recommend using a VPS to avoid having to port forward and it has some other benefits too.
- If you self-host from your own network and have a dynamic public ip you may want to use a DynDns Service like no-ip or similar.
- If you're behind a CNAT you may experience issues and need to request your own IP from your carrier. Usually you can do so for free.

[^portnote]: The port configured inside of your config.json file

