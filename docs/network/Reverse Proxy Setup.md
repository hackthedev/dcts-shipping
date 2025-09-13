# Reverse Proxy Setup

This document will explain how to use the chat software and setup a reverse proxy. This will result in the url being https://your-domain.com/app instead of https://your-domain.com:2086/ [^portnote] .

------

## nginx Setup

The following configuration is a example on how you can use the chat app using the reverse proxy. It will change the address from https://you-domain.com:2086 to https://your-domain.com/app. 

Since i couldnt find out how to make it work on a existing domain with `location /servers` i tested subdomains and worked right away. The issue was while the html was served correctly, all the endpoints kept going to `/` which was wrong.

```nginx
location / {
	proxy_pass http://127.0.0.1:3000/;
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

> [!NOTE]
>
> The apache setup was not tested yet and is only a rough example on how it could work.

> [!IMPORTANT]
>
> Its important to change the socket.io path as well because otherwise the client will run into 404 errors trying to find the socket.io endpoint. Both for nginx and apache!

> [!CAUTION]
>
> Currently there is issue where the nginx proxy would work but its unable to properly serve images. Until a fix is found its not recommended to use this. If you know what you're doing and find a fix yourself feel free to share it [on the subreddit](https://www.reddit.com/r/dcts/) or [create a issue on github](https://github.com/hackthedev/dcts-shipping/).

[^portnote]: The port configured inside of your config.json file

