# Fetching group channels

Getting the channels of a group is pretty easy. You only need to supply the following info:

- `id` is your account's id
- `token` is your account's token
- `group` is the group id where you try to get the channels from.

```js
socket.emit("getChannelTree", {
            id: UserManager.getID(),
            token: UserManager.getToken(),
            group: UserManager.getGroup()
        }, function (response) {
    	console.log(response);
});
```

------

## Response examples

### Successful fetch

```json
{
    "type": "success",
    "data": {
        "groups": {
            "0": {
                "info": {
                    "id": 0,
                    "name": "Home",
                    "icon": "/uploads/upload_108168374326_sip.gif",
                    "banner": "/uploads/upload_137733579011_konosuba.jpg",
                    "isDeletable": 1,
                    "sortId": 2,
                    "access": [],
                    "description": "undefined"
                },
                "categories": {
                    "0": {
                        "info": {
                            "id": 0,
                            "name": "General",
                            "sortId": 1
                        },
                        "channel": {
                            "0": {
                                "id": 0,
                                "name": "chat",
                                "type": "text",
                                "description": "Default Channel Description",
                                "sortId": 2,
                                "permissions": {
                                    "0": {
                                        "readMessages": 1,
                                        "sendMessages": 1,
                                        "viewChannel": 1,
                                        "viewChannelHistory": 1,
                                        "uploadFiles": 1,
                                        "maxUpload": 20
                                    },
                                    "1111": {
                                        "readMessages": 1,
                                        "sendMessages": 1
                                    },
                                    "1844": {
                                        "readMessages": 1,
                                        "sendMessages": 1,
                                        "viewChannel": 1,
                                        "viewChannelHistory": 1
                                    }
                                },
                                "msgCount": 970
                            },
                            "1178": {
                                "id": 1178,
                                "name": "voip",
                                "type": "voice",
                                "description": "Default Channel Description",
                                "sortId": 0,
                                "permissions": {
                                    "0": {
                                        "viewChannelHistory": 1,
                                        "readMessages": 1,
                                        "sendMessages": 1,
                                        "viewChannel": 1,
                                        "useVOIP": 1
                                    },
                                    "1844": {
                                        "readMessages": 1,
                                        "sendMessages": 1,
                                        "viewChannel": 1,
                                        "useVOIP": 1
                                    }
                                },
                                "msgCount": 0
                            },
                            "1822": {
                                "id": 1822,
                                "name": "marker test",
                                "type": "text",
                                "description": "Default Channel Description",
                                "sortId": 1,
                                "permissions": {
                                    "0": {
                                        "viewChannelHistory": 1,
                                        "readMessages": 1,
                                        "sendMessages": 1,
                                        "viewChannel": 1
                                    }
                                },
                                "msgCount": 126
                            }
                        }
                    },
                    "1708": {
                        "info": {
                            "id": 1708,
                            "name": "test",
                            "sortId": 0
                        }
                    },
                    "1777": {
                        "info": {
                            "id": 1777,
                            "name": "test",
                            "sortId": 0
                        },
                        "channel": {
                            "1508": {
                                "id": 1508,
                                "name": "erer",
                                "type": "text",
                                "description": "Default Channel Description",
                                "sortId": 0,
                                "permissions": {
                                    "0": {
                                        "viewChannelHistory": 0,
                                        "readMessages": 0,
                                        "sendMessages": 0,
                                        "viewChannel": -1
                                    }
                                },
                                "msgCount": 2
                            }
                        }
                    }
                }
            }
        }
    }
}
```

### Missing permissions when fetching

```json
{ type: "error", error: "Your access to this group was denied" }
```

