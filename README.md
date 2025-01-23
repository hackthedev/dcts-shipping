# DCTS - Direct Communication Through Sockets
![Version](https://img.shields.io/static/v1?label=State&message=Early%20Access&color=orange) 
<!-- ![GitHub all releases](https://img.shields.io/github/downloads/hackthedev/dcts-shipping/total?color=success&label=Downloads) -->
[Visit our new subreddit](https://www.reddit.com/r/dcts/)

This project was made with the goal to combine TeamSpeak and Discord. The goal: A platform that looks modern like Discord but runs the server like TeamSpeak. DCTS allows you to run your own Discord Server like a TeamSpeak server, in simple words.

Since you can host the server yourself you're also the one in control of the data. This could be important for people who value their data privacy.

<br>

## Support the Project ❤️
DCTS is an open-source project created to give users full control over their communication platforms. However, without community support, development may slow down significantly and could even come to a halt over time.

If you value the vision of DCTS and want to see it grow, consider making a donation. Every contribution helps accelerate development and ensures the project's future. Thank you for helping us keep DCTS alive and thriving!

[Donate via PayPal](https://www.paypal.me/devilsstore) | [Donate via Ko-fi](https://ko-fi.com/shydevil)

<br>

## Why DCTS?

> [!NOTE]
> DCTS is still in development and in an early stage. Some features may not yet be fully refined.

Modern communication platforms have limitations that DCTS is designed to overcome. Here's why DCTS exists and how it stands out:

- **Full Data Control**: Self-host your server and take complete control of your data and privacy.

- **Easy to Set Up**: With just two commands (assuming Node.js is installed), you can have your server running.

- **Community-Driven**: Responsive development ensures your feedback and feature requests are heard.

- **Modern and User-Friendly**: Combines a sleek design with an intuitive interface for both casual and advanced users.

- **Highly Customizable**: The plugin system allows endless possibilities for enhancements and features, developed by the community or officially.

- **Efficient Media Handling**: Supports advanced features like a Cloudflare image CDN for fast and smooth media uploads.

- **No Paywalls**: Enjoy full functionality without subscriptions or hidden costs—DCTS is made for everyone.

- **User-Focused**: Designed to prioritize users, not corporations.

- **Future-Proof**: Built with scalability and future features in mind.

DCTS isn't just a chat platform; it's a vision for better communication, driven by simplicity, freedom, and innovation.

<br>

## Installing
### Docker
To install via docker you can either clone and build or use the prebuilt image.
```
$ sudo docker run --name dcts-server  -p 8080:2052 ghcr.io/hackthedev/dcts-shipping
```
or via docker-compose:
```
$ curl -L -O https://github.com/hackthedev/dcts-shipping/raw/main/docker/docker-compose.yml
$ sudo docker compose up -d
```


### NPM
Requires node.js to be installed, see [Tested Versions](https://github.com/hackthedev/dcts-shipping?tab=readme-ov-file#tested-node-versions). Clone the git repository and execute the following commands inside the app's directory.
```
$ git clone https://github.com/hackthedev/dcts-shipping --depth 1
$ npm install
$ node .
```

<br>

## Connecting to your server
Once you've installed the server and its running, you can open your browser and enter the server's ip and add the port 2052.<br>
Example: http://localhost:2052<br>
Depending on your configuration the port may vary

<br>

## Tested Node Versions
- ✔️ v21.7.3
- ✔️ v18.20.2
- ✔️ v16.16.0
- 🚫 v12.22.9

<br>

## Screenshots
![image](https://github.com/user-attachments/assets/68806ef4-c7ca-489e-8d3b-690f5e43d737)

 
