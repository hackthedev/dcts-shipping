import { saveConfig, serverconfig, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sanitizeInput, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('updateGroupIcon', function (member, response) {
        if (validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {

            if (!hasPermission(member.id, "manageGroups")) {
                sendMessageToUser(socket.id, JSON.parse(
                    `{
                            "title": "Missing permissions!",
                            "message": "You arent allowed to change the group icon",
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
                if (member.value == null || member.value.length <= 0) {
                    member.value = "/img/default_pfp.png";
                }

                if(Buffer.isBuffer(member.value)){
                    response({type: "error", error: "Parameter string expected, not a buffer. Supply a string like a url"})
                    return;
                }

                member.value = sanitizeInput(xssFilters.inHTMLData(member.value));
                serverconfig.groups[member.group].info.icon = member.value;
                saveConfig(serverconfig);

                io.emit("updateGroupList");
            }
            catch (e) {
                Logger.error("Couldnt update group icon");
                Logger.error(e);
            }
        }
    });
}
