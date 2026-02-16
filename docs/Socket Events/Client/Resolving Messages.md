# Resolving Messages

Basically message resolving means that you supply a message id and the server will respond with the message object. As you can see in the example it is pretty easy. 

You'll need the following info when resolving a message:

- Your user id
- Your user token
- The message id you want to resolve

> [!IMPORTANT]
>
> You cannot resolve messages that were sent in a channel you dont have view access to.

------

## Example request

```js
socket.emit("resolveMessage", {
    id: "user id",
    token: "user token",
    messageId: "message id"
}, async (response) => {
     if (response?.error != null) {
        // do something with the error
    } else {
    	// do smth with the message object returned as "response"
    }
})
```

------

## Example results

### Successful result

As in this document's example, this is what the response will return if successful:

```json
{
    "author": {
        "id": "114755069684",
        "onboarding": true,
        "name": "Angel",
        "nickname": null,
        "status": "",
        "aboutme": "",
        "icon": "/uploads/upload_126538385360_pepeangel.png",
        "banner": "/uploads/upload_156127555007_65eeff4c209bf9c7badcd8a688136363.jpg",
        "joined": 1764832887572,
        "isOnline": true,
        "lastOnline": 1766893089626,
        "isBanned": false,
        "isMuted": false,
        "publicKey": "",
        "isVerifiedKey": true,
        "color": "#ff0000"
    },
    "room": "0-0-0",
    "message": "<p>lol</p>",
    "group": "0",
    "category": "0",
    "channel": "0",
    "editedMsgId": null,
    "replyMsgId": "196493263721",
    "timestamp": 1766881632881,
    "messageId": "134161700965",
    "reactions": {
        "94222e03429a03c44b5c5d7de644ef3fad5083f41c8cad2bd3f507852d55365b": [
            "114755069684"
        ]
    },
    "reply": {
        "author": {
            "id": "114755069684",
            "onboarding": true,
            "name": "Angel",
            "nickname": null,
            "status": "",
            "aboutme": "",
            "icon": "/uploads/upload_126538385360_pepeangel.png",
            "banner": "/uploads/upload_156127555007_65eeff4c209bf9c7badcd8a688136363.jpg",
            "joined": 1764832887572,
            "isOnline": true,
            "lastOnline": 1766893089626,
            "isBanned": false,
            "isMuted": false,
            "publicKey": "",
            "isVerifiedKey": true,
            "color": "#ff0000"
        },
        "room": "0-0-0",
        "message": "<p>test 12</p>",
        "group": "0",
        "category": "0",
        "channel": "0",
        "editedMsgId": "196493263721",
        "replyMsgId": null,
        "timestamp": 1766879980394,
        "messageId": "196493263721",
        "reply": {
            "messageId": null
        },
        "lastEdited": "2025-12-28T00:27:03.573Z"
    }
}
```

### Unsuccessful results

There are two ways a request can fail:

- The response will return `null` if not found

- The response will contain an error message if you dont have permissions to view the channel the message was sent in:

  ```json
  { error: "You dont have permission to resolve the message", message: null}
  ```

  
