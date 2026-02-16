import { saveConfig, serverconfig, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, generateId, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('createGroup', function (member) {
        if (validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {

            if (!hasPermission(member.id, "manageGroups")) {
                sendMessageToUser(socket.id, JSON.parse(
                    `{
                            "title": "Missing permissions!",
                            "message": "You arent allowed to create groups",
                            "buttons": {
                                "0": {
                                    "text": "Ok",
                                    "events": ""
                                }
                            },
                            "type": "error",
                            "popup_type": "confirm"
                        }`));
                return;
            }

            try {
                var groupId = generateId(4);
                var categoryId = generateId(4);
                var channelId = generateId(4);

                serverconfig.groups[groupId] = JSON.parse(
                    `{
                        "info": {
                            "id": "${groupId}",
                            "name": "${xssFilters.inHTMLData(member.value)}",
                            "icon": "/img/default_icon.png",
                            "banner": "/img/default_banner.png",
                            "isDeletable": 1,
                            "sortId": 0,
                            "access": [
                            ]
                        },
                        "channels": {
                            "categories": {
                                "${categoryId}": {
                                    "info": {
                                        "id": "${categoryId}",
                                        "name": "General"
                                    },
                                    "channel": {
                                        "${channelId}": {
                                            "id": "${channelId}",
                                            "name": "chat",
                                            "type": "text",
                                            "description": "Default Channel Description",
                                            "sortId": 0,
                                            "permissions": {
                                                "0": {
                                                    "readMessages": 1,
                                                    "sendMessages": 1,
                                                    "viewChannel": 0
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        "permissions": {
                            "0": {
                                "viewGroup": 0
                            }
                        }
                    }
                `);

                saveConfig(serverconfig);
                io.emit("updateGroupList");
            }
            catch (e) {
                Logger.error("Couldnt create category");
                Logger.error(e);
            }

        }
        else {

        }
    });
}
