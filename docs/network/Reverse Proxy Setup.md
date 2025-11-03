# Reverse Proxy Setup

This document will explain how to use the chat software and setup a reverse proxy. This will result in the url being https://app.your-domain.com instead of https://your-domain.com:2086/ [^portnote] , depending on the subdomain you choose or how you've setup your reverse proxy.

> [!TIP]
>
> Its recommended to use a reverse proxy as you wont have to manually deal with cert files inside the `config.json` file if your domain already uses a letsencrypt certificate.

------

## nginx Setup

The following configuration is a example on how you can use the chat app using the reverse proxy. It will change the address from https://you-domain.com:2086 to https://app.your-domain.com. 

Since i couldnt find out how to make it work on a existing domain with `location /servers` i tested subdomains and worked right away. The issue was while the html was served correctly, all the endpoints kept going to `/` which was wrong.

```nginx
location / {
	proxy_pass http://127.0.0.1:2086/;
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

## apache Setup

You can also use apache instead of nginx. You will likely need to enable specific modules.

```bash
sudo a2enmod proxy proxy_http proxy_wstunnel
sudo systemctl restart apache2
```

This is a untested apache configuration and a example on how to setup the reverse proxy:

```xml
<VirtualHost *:80>
    ServerName dcts.chat
    DocumentRoot /var/www/html

    # Proxy for /app/
    ProxyPreserveHost On
    ProxyPass /app/ http://127.0.0.1:2086/
    ProxyPassReverse /app/ http://127.0.0.1:2086/

    # Proxy for /socket.io/
    ProxyPass /socket.io/ http://127.0.0.1:2086/socket.io/
    ProxyPassReverse /socket.io/ http://127.0.0.1:2086/socket.io/

    # Handle WebSocket Upgrade
    <Location /socket.io/>
        ProxyPreserveHost On
        ProxyPass ws://127.0.0.1:2086/socket.io/
        ProxyPassReverse ws://127.0.0.1:2086/socket.io/
    </Location>

    ErrorLog ${APACHE_LOG_DIR}/error.log
    CustomLog ${APACHE_LOG_DIR}/access.log combined
</VirtualHost>
```

> [!WARNING]
>
> The apache setup was not tested yet and is only a rough example on how it could work.

[^portnote]: The port configured inside of your config.json file

