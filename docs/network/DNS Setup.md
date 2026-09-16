# DNS Setup

If you want your DCTS instance to be publicly available you will need to own a domain and add at least two A records. In the setup wizard you will need to specify these sub domains for the automatic SSL / TLS creation.

We recommend you setting up your domain with these records:

| Type | Name | Content         |
| ---- | ---- | --------------- |
| A    | chat | your.ip.address |
| A    | lk   | your.ip.address |

> [!WARNING]
> Valid SSL/TLS certificates are needed for going public!
> Without a domain the setup wizard cannot generate valid SSL/TLS certificates which will show security errors in all clients and will refuse to work properly!
