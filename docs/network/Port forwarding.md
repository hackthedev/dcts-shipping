# Port forwarding

A common issue is that ports arent being forwarded which will lead to connection failures. Since there are so many different setups its hard to make a guide on how to do it.

> [!TIP]
> You can use tools like https://canyouseeme.org/ to check if your port is publicly available. If not, your port is not forwarded.

In addition to port forwarding its also possible that a firewall is blocking the forwarded port as well. This could be done on an OS level or in your router, or maybe both. Since this depends on many factors its again hard to make a guide about it, which is why its recommended to check google for your specific setup.


---

## Log into router

Usually on the back or somewhere on your (wifi) router you should be able to find a sticker with infos about a dashboard or login infos and an address. You can enter that address in your browser and use the login information to get access to the admin panel.

From that point on you will need to do a bit of research on how to forward ports on your specific model. Generally it can be found in settings like "Network Settings" or "Security". With a bit of exploring you might find it yourself.

> [!TIP]
> Depending on your router you may need to enable something similar to an "advanced mode".

---

## List of Ports used

On default the following ports will be used inside docker and need to be available on your machine. You may need to edit the docker-compose file if you already use caddy on your host system!

- 80
- 443
- 2052
- 5000
- 7880
- 7881
- 7882
- 3478
- 5349