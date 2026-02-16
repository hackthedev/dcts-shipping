# The Message Object

### General Message Object

The message object will consists of a few key components: **Message**, **Member** (Author) and **Reply**. The example below shows a "pure" message object that has been simplified.

- The `room` value consists of `groupId`-`categoryId`-`channelId`. 
- `editedMsgId` is used to update/edit **your** existing messages
- `replyMsgId` is the target message id you want to reply to.
- `timestamp` is set by the server
- `messageId` is set by the server as well.
- `reply` is also set by the server
- `reactions` is set by the server as well and include message emoji reactions

```json
{
    "author": {
        "id": "114755069684",
    },
    "room": "0-0-0",
    "message": "<p>test</p>",
    "group": "0",
    "category": "0",
    "channel": "0",
    "editedMsgId": null,
    "replyMsgId": null,
    "timestamp": 1766532617968,
    "messageId": "174363723585",
    "reply": {
        messageId: null,
    },
    "reactions": {}
}
```

------

### Member Object

The message object will automatically include the message author's info.

- `id` is set by the server and is the user's server/account id
- `onboarding` is a flag set by the server and used internally
- `nickname` is currently unused
- `icon` is the user's profile picture
- `banner` is the user banner that can be seen on the profile
- `joined` is a unix timestamp in miliseconds
- `lastOnline` is also a unix timestamp in miliseconds
- `publicKey` is optional and may not be present for all members
- `color` is based on the member's highest role
- `isVerifiedKey` confirms the member has the correct private key too via challenge

```json
{
    "author": {
        "id": "114755069684",
        "onboarding": true,
        "name": "Angel™",
        "nickname": null,
        "status": "cool ass dev",
        "aboutme": "",
        "icon": "/uploads/upload_121720495513_icon_peak.png",
        "banner": "/img/default_banner.png",
        "joined": 1756051863924,
        "isOnline": true,
        "lastOnline": 1766556653927,
        "isBanned": false,
        "isMuted": false,
        "publicKey": "public key if available",
        "isVerifiedKey": true,
        "color": "#ff0000"
    },
    "room": "0-0-1356",
    "message": "<p>test reply</p>",
    "group": "0",
    "category": "0",
    "channel": "1356",
    "editedMsgId": null,
    "replyMsgId": "140914346248",
    "timestamp": 1766556639785,
    "messageId": "169812525145",
    "reply": {
        "messageId": null,
    }
    ,
    "reactions": {}
}
```

------

### Reaction Object

The `reactions` object will store all reactions a message has and will be made of several keys as array being based of the emoji hash and the member ids of who reacted to it.

- `94222e03429a03c44b5c5d7de644ef3fad5083f41c8cad2bd3f507852d55365b`: The emoji hash/emoji used to react to the message
- `114755069684`: One example member id of who used the emoji with the has above to react to this message.

Each array for a specific reaction can have multiple entries for the different members that reacted with the same emoji.

```json
{
    "author": {
        "id": "114755069684",
    },
    "room": "0-0-1356",
    "message": "<p>test reply</p>",
    "group": "0",
    "category": "0",
    "channel": "1356",
    "editedMsgId": null,
    "replyMsgId": "140914346248",
    "timestamp": 1766556639785,
    "messageId": "169812525145",
    "reply": {
        "messageId": null,
    },
    "reactions": {
        "94222e03429a03c44b5c5d7de644ef3fad5083f41c8cad2bd3f507852d55365b": [
            "114755069684"
        ]
    },
}
```

------

### Reply Object

When replying to a message, the `reply` object will include the object of the message you're replying too and the corresponding member (author) object. In this example i replied to myself. Its the same as above, with the message and member object.

> [!NOTE]
>
> To avoid nested structures, any further replies will only feature the `reply.messageId` rather than the object.

```json
{
    "author": {
        "id": "114755069684",
    },
    "room": "0-0-1356",
    "message": "<p>test reply</p>",
    "group": "0",
    "category": "0",
    "channel": "1356",
    "editedMsgId": null,
    "replyMsgId": "140914346248",
    "timestamp": 1766556639785,
    "messageId": "169812525145",
    "reply": {
        "author": {
            "id": "114755069684",
            "onboarding": true,
            "name": "Angel™",
            "nickname": null,
            "status": "cool ass dev",
            "aboutme": "",
            "icon": "/uploads/upload_121720495513_icon_peak.png",
            "banner": "/img/default_banner.png",
            "joined": 1756051863924,
            "isOnline": true,
            "lastOnline": 1766556653927,
            "isBanned": false,
            "isMuted": false,
            "publicKey": "public key if available",
            "isVerifiedKey": true,
            "color": "#ff0000"
        },
        "room": "0-0-1356",
        "message": "<p>test</p>",
        "group": "0",
        "category": "0",
        "channel": "1356",
        "editedMsgId": null,
        "replyMsgId": null,
        "timestamp": 1766556635343,
        "messageId": "140914346248",
        "reply": {
            "messageId": null
        }
    },
    "reactions": {}
}
```

------

## Full example

The following object is the complete JSON object of a message thats replying to another message.

```json
{
    "author": {
        "id": "114755069684",
        "onboarding": true,
        "name": "Angel™",
        "nickname": null,
        "status": "cool ass dev",
        "aboutme": "",
        "icon": "/uploads/upload_121720495513_icon_peak.png",
        "banner": "/img/default_banner.png",
        "joined": 1756051863924,
        "isOnline": true,
        "lastOnline": 1766556653927,
        "isBanned": false,
        "isMuted": false,
        "publicKey": "public key if available",
        "isVerifiedKey": true,
        "color": "#ff0000"
    },
    "room": "0-0-1356",
    "message": "<p>test reply</p>",
    "group": "0",
    "category": "0",
    "channel": "1356",
    "editedMsgId": null,
    "replyMsgId": "140914346248",
    "timestamp": 1766556639785,
    "messageId": "169812525145",
    "reply": {
        "author": {
            "id": "114755069684",
            "onboarding": true,
            "name": "Angel™",
            "nickname": null,
            "status": "cool ass dev",
            "aboutme": "",
            "icon": "/uploads/upload_121720495513_icon_peak.png",
            "banner": "/img/default_banner.png",
            "joined": 1756051863924,
            "isOnline": true,
            "lastOnline": 1766556653927,
            "isBanned": false,
            "isMuted": false,
            "publicKey": "public key if available",
            "isVerifiedKey": true,
            "color": "#ff0000"
        },
        "room": "0-0-1356",
        "message": "<p>test</p>",
        "group": "0",
        "category": "0",
        "channel": "1356",
        "editedMsgId": null,
        "replyMsgId": null,
        "timestamp": 1766556635343,
        "messageId": "140914346248",
        "reply": {
            "messageId": null
        }
    },
    "reactions": {
        "94222e03429a03c44b5c5d7de644ef3fad5083f41c8cad2bd3f507852d55365b": [
            "114755069684"
        ]
    },
}
```

