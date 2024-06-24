# DCTS - Direct Communication Through Sockets
![Version](https://img.shields.io/static/v1?label=State&message=Early%20Access&color=orange) 
<!-- ![GitHub all releases](https://img.shields.io/github/downloads/hackthedev/dcts-shipping/total?color=success&label=Downloads) -->
[Visit our Forum (Planned Features and more)](https://dcts.chat/)

This project was made with the goal to combine TeamSpeak and Discord. The goal: A platform that looks modern like Discord but runs the server like TeamSpeak. DCTS allows you to run your own Discord Server like a TeamSpeak server, in simple words.

Since you can host the server yourself you're also the one in control of the data. This could be important for people who value their data privacy.

<br>

## Licensing
<p xmlns:cc="http://creativecommons.org/ns#" xmlns:dct="http://purl.org/dc/terms/"><a property="dct:title" rel="cc:attributionURL" href="https://github.com/hackthedev/dcts-shipping/">DCTS</a> by <a rel="cc:attributionURL dct:creator" property="cc:attributionName" href="https://github.com/hackthedev/">Marcel aka HackTheDev</a> is licensed under <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/?ref=chooser-v1" target="_blank" rel="license noopener noreferrer" style="display:inline-block;">Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International<img style="height:22px!important;margin-left:3px;vertical-align:text-bottom;" src="https://mirrors.creativecommons.org/presskit/icons/cc.svg?ref=chooser-v1" alt=""><img style="height:22px!important;margin-left:3px;vertical-align:text-bottom;" src="https://mirrors.creativecommons.org/presskit/icons/by.svg?ref=chooser-v1" alt=""><img style="height:22px!important;margin-left:3px;vertical-align:text-bottom;" src="https://mirrors.creativecommons.org/presskit/icons/nc.svg?ref=chooser-v1" alt=""><img style="height:22px!important;margin-left:3px;vertical-align:text-bottom;" src="https://mirrors.creativecommons.org/presskit/icons/sa.svg?ref=chooser-v1" alt=""></a></p>

<br>

## Installing
### Docker
To install via docker you can either clone and build or use the prebuilt image.
```
$ sudo docker run --name dcts-server  -p 8080:2052 ghcr.io/t2vee/dcts
```
or via docker-compose:
```
$ curl -L -O https://github.com/t2vee/dcts-shipping/raw/docker-support/docker/docker-compose.yml
$ sudo docker compose up -d
```


### NPM
Requires node.js to be installed, see [Tested Versions](https://github.com/t2vee/dcts-shipping/tree/docker-support?tab=readme-ov-file#tested-versions). Clone the git repository and execute the following commands inside the app's directory.
```
$ git clone https://github.com/hackthedev/dcts-shipping --depth 1
$ npm install
$ node .
```

<br>

## Connecting to your server
Once you've installed the server and its running, you can open your browser and enter the server's ip and add the port 2052.<br>
Example: localhost:2052

<br>

## Tested Versions
- ✔️ v21.7.3
- ✔️ v18.20.2
- ✔️ v16.16.0
- 🚫 v12.22.9

<br>

## Tutorial
(version in video slightly outdated)<br>
[![IMAGE ALT TEXT HERE](https://img.youtube.com/vi/LJ_IEe7nZnw/0.jpg)](https://www.youtube.com/watch?v=LJ_IEe7nZnw)
