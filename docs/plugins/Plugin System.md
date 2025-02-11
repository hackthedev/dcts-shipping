# Plugin System

This document will explain how the plugin system works and how you can create your own plugins.

[TOC]

------

## What are plugins?

Instead of traditional bots that are similar to users we use plugins. The plugin system is designed to perfectly integrate into the server and client, giving you absolutely freedom and control. What does that mean? Instead of relying on an API you can directly execute your code on the server and web client.

This means you could add custom features that perfectly integrate or even change existing features and functions to your likings. To be short: You can do anything.

### Why not modify the source code?

You could change the source code of your server and make edits there but if you plan to update your server at some point all of your changes would be overwritten and lost. When making a update, the plugins folder is never overwritten therefore keeping your changes.

By making a plugin you can also share it with other users or even sell it.

------

## Plugin structure

Plugins are located inside the project's main folder's plugin folder. If the project's root folder is *`dcts`* then it means plugins would be located at *`/dcts/plugins`*.  Plugins have to follow a specific structure to function.

```
E:\dcts\plugins:
└───sample
    ├───functions
    │       info.mjs
    │       plugin_onLoad.mjs
    │
    ├───sockets
    │       test.mjs
    │
    └───web
            main.js
```

### Running Server-side Code

In order to run code on the server side you need to go into the *`functions`* folder of your plugin. To execute your code when the server starts you need to create a file containing *`onLoad`* in the filename. It also needs to have the *`.mjs`* file extension. As you can see in the example structure the filename *`plugin_onLoad.mjs`* would be valid and executed when the server starts.

The code inside your *`onLoad`* file could look like this:

```js
// Example Imports
import Logger from "../../../modules/functions/logger.mjs";
import { pluginInfo } from "./info.mjs" // your custom file

// Example Code
Logger.info("Content")
Logger.success("Content");
Logger.error("Content")

export function exampleAdd(a, b){
    return a + b;
}    
```

> [!TIP]
>
> Everything thats supposed to be run on the server side needs to be inside the *`functions`* folder. You can create other files to import into your *`onLoad`* file.

### Adding Socket Events

You can add custom socket events and even remove or redefine existing socket events. All socket events have to be inside the *`sockets`* folder of your plugin folder. As long as it has the *`.mjs`* file extension it will be automatically imported when the server starts.

The /sockets/test.mjs file could look like the following:

```js
import { validateMemberId } from "../../../modules/functions/main.mjs";
import { serverconfig } from "../../../index.mjs";

export default (socket) => {    
    socket.on('test', (member, response) => {
        // Always include this if block for security!
        if (
            validateMemberId(member.id, socket) === true &&
            serverconfig.servermembers[member.id].token === member.token
        ) {
            /* Add your custom code here */
            response({ type: 'success', message: "Worked!" });
            
        } else {
            response({ type: 'error', message: 'Invalid member or token' });
        }
    });    
};
```

You can also remove existing socket events and redefine them. This could be done improve or change the way a socket event processes a request and potentially add support for third party software.

```js
// remove only one specific event
socket.off('messageSend');

// remove all handlers if there are multiple
socket.removeAllListeners('messageSend');
```

> [!CAUTION]
>
> Its absolutely important to keep the structure of the socket example file. Its recommended to add your code after line 11 as in the example for security reasons!

### Adding Client-side Code

For the client side code to run when the page has loaded its important to call it *`main.js`*. Within this file you can run any code on the client. You can use it to call socket events, add or edit functions or alter the client in any other way. Since everything integrates directly into the server and client the possibilities are endless.

As example, you could add this code into the main.js file to make all channel names appear red.

```js
// Example Code
// The main.js file is your entry point (client-side). and will run automatically

let channels = document.querySelectorAll("#channeltree a");

channels.forEach(channel => {
    channel.style.color = "red";
});
```

------

## Applying plugin changes

If you made a plugin the changes will only be applied once you restart the server as the files from /plugins will only be processed and moved to their places once the server starts.