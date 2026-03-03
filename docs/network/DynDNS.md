# Dynamic DNS

When you want to host a DCTS server on your own network its possible that you have a dynamic IP address, which means your public ip address will change in specific intervals, usually every 24 hours.

If that is the case you could use a DynDNS service like [no-ip](https://www.noip.com/) or similar services. This way you can get a "free domain" from the service provider you choose and your address will stay the same while the IP address will automatically update, possibly with a piece of software you may have to install as well.

Generally speaking DCTS wasnt designed with DynDNS in mind but there are creative ways to get it to work. You could get yourself an actual domain and point it to your DynDNS address as example.