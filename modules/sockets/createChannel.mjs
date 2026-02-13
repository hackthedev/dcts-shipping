import { saveConfig, serverconfig, xssFilters } from "../../index.mjs";
import { getChannelTree, hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, escapeHtml, generateId, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('createChannel', function (member, response) {
        if (validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {

            if (!hasPermission(member.id, "manageChannels")) {
                response({ msg: "You are not allowed to create a channel", type: "error", error: "Missing permissions to create channel" })
                return;
            }

            try {
                var channelId = generateId(4); 
                serverconfig.groups[member.group].channels.categories[member.category].channel[channelId] = JSON.parse(
                    `{
                            "id": "${channelId}",
                            "name": "${xssFilters.inHTMLData(escapeHtml(member.value))}",
                            "type": "${member.type}",
                            "description": "Default Channel Description",
                            "sortId": 0,
                            "permissions": {
                                "0": {
                                    "viewChannelHistory": 0,
                                    "readMessages": 0,
                                    "sendMessages": 0,
                                    "viewChannel": -1
                                }
                            }
                        }
                    `);                  

                saveConfig(serverconfig);
                io.emit("receiveChannelTree", getChannelTree(member));
                response({ msg: "Channel created successfully", type: "success" })
            }
            catch (e) {
                Logger.error("Couldnt create channel");
                Logger.error(e);
            }
        }
    });
}
