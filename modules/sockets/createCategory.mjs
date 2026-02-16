import { saveConfig, serverconfig, xssFilters } from "../../index.mjs";
import { getChannelTree, hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, escapeHtml, generateId, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here

    socket.on('createCategory', function (member, response) {
        if (validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {

            member.id = xssFilters.inHTMLData(member.id)
            member.token = xssFilters.inHTMLData(member.token)
            member.group = xssFilters.inHTMLData(member.group)
            member.value = xssFilters.inHTMLData(member.value)

            if (!hasPermission(member.id, "manageChannels")) {
                response({ error: "Missing permissions: manageChannels", msg: "Cant create category because you dont have the permissions to manage channels", type: "error" })
                return;
            }

            if (!member.group) {
                response({ error: "Missing parameter: group", msg: "No group specified", type: "error" })
            }

            try { 
                var catId = generateId(4);
                serverconfig.groups[member.group].channels.categories[catId] = JSON.parse(
                    `{
                            "info": {
                                "id": "${catId}",
                                "name": "${escapeHtml(member.value)}",
                                "sortId": 0
                            },
                            "channel": {
                            }
                        }
                            `);
                saveConfig(serverconfig);
                response({ error: null, msg: "Category created!", type: "success" })

                io.emit("receiveChannelTree", getChannelTree(member));
            }
            catch (e) {
                Logger.error("Couldnt create category");
                Logger.error(e);
            }

        }
        else {
            Logger.debug("Invalid token?")
        }
    });
}
