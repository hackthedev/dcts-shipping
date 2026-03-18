# DNS Setup

Its recommended to create two subdomains for the VoIP system to make things easier. The subdomains are used for the reverse proxies and they should point to the server where you run DCTS and livekit. 

> [!TIP]
> Example proxies for caddy and nginx can be found in [Reverse Proxy Setup](Reverse%20Proxy%20Setup.md). How to setup caddy can be found in [Caddy Setup](Caddy%20Setup.md).

| Type | Name | Content         | Proxy needed? |
| ---- | ---- | --------------- | ------------- |
| A    | chat | your.ip.address | Yes           |
| A    | lk   | your.ip.address | Yes           |

> [!WARNING]
> Please note that you will need to have valid TLS certificates for your subdomains and access to the cert files as they will be needed later for the configuration of livekit. You can install caddy to handle the TLS certs automatically. More on that can be found in [Caddy Setup](Caddy%20Setup.md) and [Reverse Proxy Setup](Reverse%20Proxy%20Setup.md).