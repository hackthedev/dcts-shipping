The messenger feature is a huge addition to DCTS as it expands our reach and gives the user a fully decentralized, easy to use messaging system thats fully end-to-end encrypted and works for both desktop (Windows, Linux, ..) and mobile (android app).

The purpose of this document is to give a quick overview of how things work and what to expect.

---

## How it works

### Key based encryption

When first launching the desktop client or mobile app on a device, a key is generated on that device. This key is used for the encryption and decryption of messages. In addition to that a "global id" is generated based on the key so its possible to message other users in a more convenient way.

To make it even more convenient an alias system was introduced, turning your "global id" from a long random string (e.g. *dfjkh445t38459ufsdfjn...*) to a format similar to usernames (e.g. angel).

Since the messenger is key based there is no need for an account on any server, the mobile app or desktop client can be installed and used right away for chatting. There is no need to handle any keys as its all done automatically in the background.

Unlike in the server DMs (direct messages) where message encryption can be toggled, the messenger cannot be toggled and is forced to always encrypt messages. This also means that the messenger feature is not available in the web client/version.

### Client connection

To avoid NAT issues and other potential issues the messenger is not using Peer-To-Peer. The messenger was designed with a "home server" approach, meaning users can pick a server as their home server and receive all their messages via that server, **even when offline**.

This means if your home server's address is `cool-dcts-server.com`, and your alias is `billy`, your public address would become `billy@cool-dcts-server.com`. This way anyone can reach you and send you messages without needing to exchange public keys manually and has a similar convenience as emails.

On default the home server will be set to `chat.network-z.com`, being the official DCTS server. This was done in order to keep the onboarding process as simple as possible. Any DCTS instance can be set as home server.

Messaging is done in real-time using web sockets via your home server. When someone wants to message you from a different server, they will connect to your home server for the time being while also being connected to their home server at the same time, meaning users can chat across different servers.

### Message Storage

Since the server is forwarding messages between users it is temporarily stored on the server (in encrypted form) for a certain amount of time. Once you're online the desktop client or mobile app will sync with the server and store any new messages locally on your device. Messages received while you're online are received in real-time and temporarily stored on the server in case you need to sync other devices as well.

### Self-Hostable

You can easily host your own home server. As of the time of writing this is done by hosting a DCTS instance but there are some ideas of making a custom small messaging server for those that dont need the community aspect of DCTS. Since the server-side logic for the messenger is already an independent package this would require minimum afford.

### VoIP & File Sharing

As of the time of writing there is no voice chatting or screensharing yet inside the messenger as well as file uploading. While its going to be added in the future the actual technical implementation is still being planned. While it would be easy to use the home server for VoIP and file sharing its not certain if this route would be ideal and something instance owners would want as it can be resource intense.

### Key transfer

Right now transferring encryption keys is not supported in the client yet and would need to be done manually via usb sticks/cables and moving the key file manually. Most of the prerequisites are already implemented for this feature tho (qr code based key transfer)

###  Key loss

If you loose your key file and you didnt back it up or cant restore it otherwise ***it will be lost forever***. This means your DMs cannot be read again. While others can still send you messages you wont be able to receive and decrypt them. Your account would be officially lost.