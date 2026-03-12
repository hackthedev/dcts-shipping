import { saveConfig, serverconfig, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sanitizeInput, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('updateGroupIcon', async function (member, response) {
        if (await validateMemberId(member?.id, socket, member?.token) === true
        ) {

            if (!await hasPermission(member.id, "manageGroups")) {
                return sendMessageToUser(socket.id, JSON.parse(
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
            }

            try {
                if (member.value == null || member.value.length <= 0) {
                    member.value = "/img/default_pfp.png";
                }

                if(Buffer.isBuffer(member.value)){
                    return response({type: "error", error: "Parameter string expected, not a buffer. Supply a string like a url"})
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
