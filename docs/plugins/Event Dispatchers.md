# Event Dispatchers

Event Dispatchers are used to send out events in the web client so that plugins can hook into these events and possibly process the event.

Example:

```js
// on message SEND event
EventDispatcher.on("messageSend", async(payload) => {
    let {message, channelType} = payload;

    if(channelType === "discord_text"){
        let sendingResult = await sendDiscordMessage(message)
    }
})

```

---

## Available events

**infiniteScroll**
*Description*: When the chat is scrolled all the way to the top 
*Data*:
```json
{
	element,
	channelType: await getCurrentChannelType(),
	channelId: UserManager.getChannel()
}
```

**messageSend**
*Description*: When a user is sending a message, but before it is sent to the server. Channel types other than `text` are not sent to the server.
*Data*:
```json
{
	message: msgPayload,
	channelType,
}
```

**getChannelTree_finish**
*Description*: After the entire channel tree was rendered.
*Data*: none

**messageCreate**
*Description*: New incoming message received.
*Data*:
```json
{
	message
}
```

**getChatLog**
*Description*: When the chat log requests starts
*Data*:
```json
{
	container, // element where the chat messages will be inserted into
	index, // timestamp filter for messages in the past. (createdAt < index)
	appendTop, // for infinite scroll. if messages are inserted above
	channelId, 
	channelType: await getCurrentChannelType(channelId), 
	firstElement: refElement, // first message element if chat; can be null
	preventDispatch // prevent endless loops
}
```

**getChatLog_finish**
*Description*: After the chat log was fetched and inserted
*Data*:
```json
{
	container, 
	index, 
	appendTop, 
	channelId, 
	channelType: await getCurrentChannelType(channelId), 
	firstElement: refElement, 
	preventDispatch
}
```
