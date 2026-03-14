# Technical overview

DCTS is a system made of various sub systems that will be explained in this document. The purpose of this document is to shine some light on how things work. You may want to check out [Terminology](Terminology.md) first.


---

## System overview

Here is a short and simplified overview that will be further explained later in the document. To keep things simple for now it comes down to the following:

- Runtime: Bun/NodeJS
	- Bun is preferred for performance reasons. NodeJS is used for legacy and can be used for bun-incompatible setups and systems like old hardware etc.
- Data:
	- Most of the data is stored either in the database or `config.json` file. On launch specific data is pulled into memory and will continue to operate from there.
- DCTS Server
	- The core that brings everything together and will hold all information. The web client is only the interface.
- Web Client
	- Served and shipped with the DCTS Server. Communicates with the DCTS Server.
- Desktop Client
	- An electron-based multi-os desktop client that enables private/public key based end-to-end encryption in DMs and server chat message signing. Basically an embedded Web Client with extra features.
- dSync
	- Used for event-based server-to-server communication. It was custom purpose build to create decentralized networks and manage communications between servers/nodes, in that case between multiple instances/ DCTS Servers. 
- MariaDB SQL Database
	- Used for storing frequent data like messages, reports, audit logs and more.
- Livekit for Media sharing
	- Responsible for handling voice calls, screen/camera sharing. Actual media like images etc are handled by the DCTS Server.
- Socket.io for real time socket events
	- For example for messaging and other communication between the DCTS Server and web client.


---

## Auth

A member can register an account on any instance and that account will only be stored on that instance itself. It is possible for a member to export an account to re-import it on another instance to keep the same account, making accounts portable. Auth itself is usually done via a member's account id and token.

While currently not implemented, it is planned that this is automatically done with the desktop client in the future and in the background to keep things seamless. Its also planned to implement an "account picker" and the option to use default accounts.

Its also possible to authenticate using your private/public key by solving a challenge to verify that you actually are the owner of a public key thats linked to your account. While this is already implemented and working, its not being used yet. Accounts can only handle one public key as of right now as there is no update mechanism since its not fully implemented yet and are optional too.

In case you were logged out, you can re-import your account from the exported file to log back in. If you didnt export your account, you can also log-in traditionally by using your chosen login name and password.

>[!NOTE]
>It is planned to automate auth with the desktop client soon.

> [!WARNING]
> As of right now its not possible for you to change your password in case you forget it when trying to log-in. You will need to reach out to an instance admin for them to change it for you. This will soon be changed with an update too.


---

## Server / Client communication

The web client and DCTS server mostly communicate with each other using web sockets, specifically socket.io. There are some parts of the web client where communication will be done via simple http fetch requests.

>[!INFO]
Example flow: 
> 
 >User sends message » Web Client » Socket » Server » RAM Data » DB » Broadcast » Client
 >


---

## Database Layer

The database is used to store frequent data like messages. It will also store user accounts, some specific cache, reports, dms, and much more. As of right now there are still some important parts that are stored inside the `config.json` file that will be moved to the database as well, like channels, groups, roles, role members and similar.

Its planned to move as much relevant info to the database to be able to load balance an instance or even have multiple instances running together to form some sort of CDN.


---

## Runtime Data

When the instance starts, it will load relevant data from the `config.json` and database into ram and it keep it there. Whenever data is being updated it will change the data kept in ram and will at the same time update relevant files or the database. So currently both the `config.json` file and database are being used to run a DCTS server. Its planned to move more data to the database to enable "multi-instance operations", as in having multiple processes or multiple servers from different regions operate on the same data.

This way operations are usually quick. So far there havent been any performance issues. More on the current performance can be found in [Performance](../Performance.md).


---

## Media

Its possible for members to upload data to an instance based on permissions, like "can upload" and "upload limit". This means its possible to have individual per-role upload limits for members. Inside the `config.json` file is also a section for `uploadFileTypes` which is basically a whitelist of allowed file mime types.

On default these files are stored in `/public/uploads` which can be found in the instance's root path. Other media like voice calls, screen and camera shares are handled by livekit itself.


---

## VoIP

For voice calls, screen and camera shares DCTS uses livekit. While it seems to support E2EE (end-to-end encryption) its currently not implemented. There are plans when VC Calls will be added for DMs to implement E2EE for these private calls.


---

## Decentralization

In order to form a flexible decentralized network [dSync](https://www.npmjs.com/package/@hackthedev/dsync) was created. It is a simple transport library to enable event based server-to-server communication, or in other words let nodes communicate with each other. It also comes with a few other custom-made libraries like [dSyncSign](https://www.npmjs.com/package/@hackthedev/dsync-sign) which takes care of event signing and verification and a few other libraries. In addition it will work based on a trust system for nodes and automatic penalties.

Generally speaking it is a very simple, flexible yet powerful family of libraries to take care about secure decentralized communication and will be a key component when it comes to federating specific data and powers the decentralized instance list inside DCTS and much more soon.

There are additional features like rate limits to prevent abuse and based on the implementation events can be emitted to broadcast abuse to other nodes to rule out bad actors automatically. Since all events must be signed, an event from an abuser can be shared securely and every node for themselves can verify the data from an event.

Connections between nodes wont be persistent and will only stay alive during data exchanges. It is designed to connect to the node directly, so its basically a peer-to-peer connection. It is required for dSync to implement a custom discovery mechanism, which is already implemented in DCTS and pretty trivial to do as well. 

Automatic discovery is assisted by the desktop client, federation itself will not depend on it. It will store the instances it has connected to and will exchange that information when it connects to a node. When a user visits multiple servers it will automatically spread. Imagine it like a bee in a field of flowers. In addition its possible to manually submit nodes using the web client. Admins have a small status system to either block, approve or set a submitted node as pending.

Generally speaking, the dSync syntax and style is somewhat inspired from socket.io.