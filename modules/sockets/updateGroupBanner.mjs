import { io, saveConfig, serverconfig, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, escapeHtml, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (socket) => {
    // socket.on code here
    socket.on('updateGroupBanner', function (member) {
        if (validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {

            if (!hasPermission(member.id, "manageGroups")) {
                sendMessageToUser(socket.id, JSON.parse(
                    `{
                            "title": "Missing permissions!",
                            "message": "You arent allowed to change the group banner",
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
                // Default Fallback Banner
                if (member.value == null || member.value.length <= 0) {
                    member.value = "https://t4.ftcdn.net/jpg/04/46/93/93/360_F_446939375_83iP0UYTg5F9vHl6icZwgrEBHXeXMVaU.jpg";
                }

                member.value = escapeHtml(member.value);
                serverconfig.groups[member.group].info.banner = member.value;
                saveConfig(serverconfig);

                io.emit("updateGroupList");
                //io.emit("receiveGroupBanner", member.value); // bug
            }
            catch (e) {
                Logger.error("Couldnt update group banner");
                Logger.error(e);
            }
        }
    });
}
