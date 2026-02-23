# Reverse Proxy Setup

This document will explain how to use the chat software and setup a reverse proxy. This will result in the url being https://app.your-domain.com instead of https://your-domain.com:2052/ [^portnote] , depending on the subdomain you choose or how you've setup your reverse proxy.

> [!TIP]
>
> Its recommended to use a reverse proxy as you wont have to manually deal with cert files inside the `config.json` file if your domain already uses a letsencrypt certificate.

------

## nginx Setup

The following configuration is a example on how you can use the chat app using the reverse proxy. It will change the address from https://you-domain.com:2052 to https://app.your-domain.com. 

Since i couldnt find out how to make it work on a existing domain with `location /servers` i tested subdomains and worked right away. The issue was while the html was served correctly, all the endpoints kept going to `/` which was wrong.

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
```

------

## caddy Setup

Caddy may be simpler to use and already takes care of SSL (TLS) as well and may be preferred.

```
# DCTS-$domain
chat.your-domain.com {
    reverse_proxy 127.0.0.1:2052 # or localhost instead of 127.0.0.1
}
```



[^portnote]: The port configured inside of your config.json file

