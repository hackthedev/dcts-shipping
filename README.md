# DCTS - Direct Communication Through Sockets
![Version](https://img.shields.io/static/v1?label=State&message=Early%20Access&color=orange) 
<!-- ![GitHub all releases](https://img.shields.io/github/downloads/hackthedev/dcts-shipping/total?color=success&label=Downloads) -->
[Visit our new subreddit](https://www.reddit.com/r/dcts/)

This project was made with the goal to combine TeamSpeak and Discord. The goal: A platform that looks modern like Discord but runs the server like TeamSpeak. DCTS allows you to run your own Discord Server like a TeamSpeak server, in simple words.

Since you can host the server yourself you're also the one in control of the data. This could be important for people who value their data privacy.


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

 
