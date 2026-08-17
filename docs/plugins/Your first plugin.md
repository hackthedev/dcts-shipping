# Your first plugin

In order to create your first plugin lets navigate into the plugins directory found in your DCTS' folder. There you create a folder with the name of your plugin, in this case "example-plugin".

> [!NOTE]
> The plugin name needs to be url friendly! You can set the proper display title in the config.json file.

Okay now that we are in your plugin folder (e.g. `/home/name/dcts/plugins`) we will need to create some basic structure.

---

## File & Folder setup

In the plugins directory, create the following folders and files so it reflects this structure:

```
├── config.json 
│ 
├── functions  
│   └── plugin_onLoad.mjs  
│
├── README.md  
│
├── sockets  
│
└── web  
   └── main.js  
```

The `README.md`  and `web/main.js/`  files are the only optional files, tho a README is highly recommended!

---

## Config Setup

The `config.json` file expects a specific strucutre. The minimum required strucutre is as following:

```json
{
  "title": "My cool plugin!",
  "author": "Your name here",
  "image": "https://...",
  "version": 1,
  "dependencies": [
    "package@version"
  ],
  "settings": {
	"your_setting_1": "bla",
    "another_settings": {
      "another_key": "some value",
    }
  }
}
```

There are some things to now
- Inside  `settings` you can define whatever you want. Everything you enter here will be visible to the admin in the plugins settings page! For example if you're making a bot, you could let users enter a bot token this way.
- If you plugin requires any other rider/npm/bun packages, you can define it inside `dependencies` and they will be automatically installed when installing a plugin or when the server starts.
- `image`: You can define a plugin image url which will be shown as banner in the plugin list inside of the DCTS plugin screen.

---

## Server Entry Point

If you want to modify the backend of the DCTS server you will need to create a file inside your plugin folder's `functions` folder and needs to include `onLoad` in the file name. Additionally it needs to end with `.mjs`.

Example: `/home/name/dcts/plugins/example-plugin/functions/plugin_onLoad.mjs`. The file content itself doesnt require any special structure.

> [!NOTE]
> You cannot use `require()` for the backend, only import.

---

## Socket Handlers

You can also register custom socket.io events using the `sockets` folder! The DCTS Plugin System will simply scan for all files ending in `.mjs` . In addition these files require a specific strucutre:

```js
import { validateMemberId } from "../../../modules/functions/main.mjs";

export default (socket) => {
    socket.on('yourCoolEventName', async (member, response) => {
	    // your custom code here!
        if (await validateMemberId(member?.id, socket, member?.token) === true) {

            // some cool code here ;)
            response({ error: null });
        }
    });
};
```

The key element here is `export default (socket) => {}`, as socket files that do not have this line inside them wont be loaded. This means you can use these socket files to also register express endpoints like this:

```js
import {app} from "../../../index.mjs"

// just here for the sake of being loaded
export default (socket) => {};

// your custom code outside of it
app.get("/someurl", async (req, res) => {
    doSomething();
    res.send("Hello World!");
})

function doSomething(){
    // sick code here
}
```

As long as the magic line is present, you can do whatever you want.

---

## Web Entry Point

In order to manipulate the web client shipped from the DCTS Server you need to have a file named `main.js` inside it. If present this is the first file the web client will load.

From there you can do pretty much anything, like loading additional files, injecting css and more.

```js
// Example code
injectCss("/plugins/discord-bridge/messages.css")
loadScript("/plugins/discord-bridge/web/stuff.js")

// on message SEND event
EventDispatcher.on("messageSend", async(payload) => {
    let {message, channelType} = payload;

    if(channelType === "discord_text"){
        let sendingResult = await sendDiscordMessage(message)
    }
})
```

There has been work going into providing some tools specifically made for plugins as you can see in this example. You can find all default events in [Event Dispatchers](Event%20Dispatchers.md).

---

## README

By creating a `README.md` file it will be displayed on the plugin info page and will be rendered. You can use it to explain what your plugin does, its purpose and more.