# Caddy setup

Caddy is basically a web server that automatically takes care of  SSL/TLS and is pretty easy to use. If you dont use nginx already i recommend using caddy to anyone thats new to self hosting etc.


---

## Installing caddy

The install instructions for caddy can be found [on their website](https://caddyserver.com/docs/install). Basically it comes down to this for Linux Debian.

```bash
apt install caddy
```


---

## Config file

Once installed you should have a config file called `Caddyfile` at this location `/etc/caddy/`, resulting in a path like `/etc/caddy/Caddyfile`. You can edit the config using nano or any other editor of your choice.

If you made changes to it you can reload caddy using the following commands.

```bash
caddy --reload --config=/etc/caddy/Caddyfile

# or alternatively
systemctl reload caddy
```

> [!TIP]
> On default there are already some configuration lines inside the caddy file. You can delete all of them if you dont need them, and if you only use it for DCTS i recommend removing those lines
> 
> When using the nano editor you can remove lines by pressing `CTRL + K`. To exit the editor you can press `CTRL + X`. If you made changes to the file you need to press `CTRL + X` , `Y` and `Enter` to save them.

---

## Reverse Proxies

Now that caddy is installed you could setup some of the reverse proxies needed for DCTS. Example proxies can be found inside of [Reverse Proxy Setup](Reverse%20Proxy%20Setup.md).

> [!TIP]
> Cert files can usually be found at `/var/lib/caddy/.local/share/caddy/certificates/acme-v02.api.letsencrypt.org-directory/` which will be needed later for the livekit setup.