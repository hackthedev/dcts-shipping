# Fetching chat messages

Fetching server chat messages is pretty simple. As you can see in the example below, you only need a few properties to get the messages from a channel:

- `id` is your user account id
- `token` is your user account token
- `groupId` is the id of the group where the channel is located at
- `categoryId` is the category's id of where the channel is located at
- `channelId` is the id of the target **text** channel.
- `index` is optional and can be null or not supplied at all. You can supply a unix timestamp in miliseconds to fetch further messages this way *(createdAt < index)*.

> [!NOTE]
>
> The server side **limit for fetching messages** is set to 50 messages per request. If you want to load more messages you'll need to use the `index` property.

> [!TIP]
>
> For testing, you can find the group, category and channel id inside the url when viewing a channel. The ids for the default group, category and channel are all `"0"` (`/?group=0&category=0&channel=0`).

```json
socket.emit("getChatlog", {
        id: UserManager.getID(),
        token: UserManager.getToken(),
        groupId: UserManager.getGroup(),
        categoryId: UserManager.getCategory(),
        channelId: UserManager.getChannel(),
    	index: null
    }, async (response) => {
    console.log(response)
})
```

------

## Response examples

### Successful response

```json
{
    "data": [
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
                "lastOnline": 1766912139402,
                "isBanned": false,
                "isMuted": false,
                "publicKey": "-",
                "isVerifiedKey": true,
                "color": "#ff0000"
            },
            "room": "0-0-0",
            "message": "<p style=\"cursor:pointer\">test</p>",
            "group": "0",
            "category": "0",
            "channel": "0",
            "editedMsgId": null,
            "replyMsgId": null,
            "timestamp": 1766547310370,
            "messageId": "110190787053",
            "reply": {},
            reactions: {}
        },
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
                "lastOnline": 1766912139402,
                "isBanned": false,
                "isMuted": false,
                "publicKey": "",
                "isVerifiedKey": true,
                "color": "#ff0000"
            },
            "room": "0-0-0",
            "message": "<p style=\"cursor:pointer\">aa</p>",
            "group": "0",
            "category": "0",
            "channel": "0",
            "editedMsgId": null,
            "replyMsgId": null,
            "timestamp": 1766549441877,
            "messageId": "167498043669",
            "reply": {
                "messageId": null
            },
            reactions: {}
        }
}
```

### Response with no messages found

```json
{
    "data": [],
    "type": "text"
}
```

### Response when permissions are missing

```json
{type: "error", error: "denied"}
```

